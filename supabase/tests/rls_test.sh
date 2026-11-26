#!/bin/bash
# =====================================================================
# Foodrun — row-level security test suite
# =====================================================================
# Builds a throwaway Postgres inside Docker, applies the real migrations,
# then runs 40 assertions about who can read and write what.
#
#   ./rls_test.sh
#
# It does NOT touch your live Supabase project. It only uses a temporary
# database inside a container, and resets it every run.
#
# Required: Docker running, and the "postgres:16" image available
# (the script pulls it the first time).
#
# Environment overrides:
#   CONTAINER=frtest DB=foodrun IMAGE=postgres:16 ./rls_test.sh
# =====================================================================
set -u

CONTAINER="${CONTAINER:-frtest}"
DB="${DB:-foodrun}"
IMAGE="${IMAGE:-postgres:16}"
PORT="${PORT:-55432}"
PASS=0
FAIL=0

# Windows/Git-Bash friendly: keep "/foo" arguments from being rewritten.
export MSYS_NO_PATHCONV=1

here="$(cd "$(dirname "$0")" && pwd)"

log() { echo "  $*"; }

# --- 1. Start (or reuse) the container ---------------------------------
if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Start Docker Desktop and try again." >&2
  exit 1
fi

if ! docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  log "creating container $CONTAINER on port $PORT"
  docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=test \
    -e POSTGRES_DB="$DB" -p "$PORT:5432" "$IMAGE" >/dev/null || exit 1
elif ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  log "starting existing container $CONTAINER"
  docker start "$CONTAINER" >/dev/null || exit 1
fi

for _ in $(seq 1 30); do
  docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1 && break
  sleep 2
done

# --- 2. Copy the SQL into the container --------------------------------
# Paths are passed as Windows paths because docker cp runs on the host.
to_container() { # to_container <hostfile> <containerfile>
  local win
  win="$(cygpath -w "$1" 2>/dev/null || echo "$1")"
  docker cp "$win" "$CONTAINER:$2" >/dev/null || { echo "copy failed: $1" >&2; exit 1; }
}

log "copying files"
to_container "$here/auth_mock.sql"  "/run_auth.sql"
to_container "$here/setup.sql"      "/run_setup.sql"
to_container "$here/../migrations/0001_schema.sql" "/run_0001_schema.sql"
to_container "$here/../migrations/0002_rls.sql"    "/run_0002_rls.sql"
to_container "$here/../migrations/0003_carts.sql" "/run_0003_carts.sql"
to_container "$here/../migrations/0006_agent_status_guard.sql" "/run_0006_agent_status_guard.sql"
to_container "$here/../migrations/0007_agent_assignment_guard.sql" "/run_0007_agent_assignment_guard.sql"

# --- 3. Fresh database every run ---------------------------------------
log "rebuilding database $DB"
docker exec "$CONTAINER" psql -U postgres -d postgres -q \
  -c "drop database if exists $DB;" \
  -c "drop role if exists authenticated;" \
  -c "drop role if exists anon;" \
  -c "create database $DB;" >/dev/null 2>&1

for f in auth 0001_schema 0002_rls 0003_carts 0006_agent_status_guard 0007_agent_assignment_guard setup; do
  if ! docker exec "$CONTAINER" psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 -q \
      -f "/run_$f.sql" >/dev/null 2>&1; then
    echo "FAILED while running $f — re-run to see the error:" >&2
    echo "  docker exec -it $CONTAINER psql -U postgres -d $DB -f /run_$f.sql" >&2
    exit 1
  fi
done

# --- 4. Assertions -----------------------------------------------------
# The key to a meaningful test: run as anon/authenticated, never as
# postgres. postgres is a superuser and bypasses row-level security, so
# every check would pass even if the rules were missing entirely.
ADMIN='11111111-1111-1111-1111-111111111111'
ACUST='22222222-2222-2222-2222-222222222222'
BCUST='33333333-3333-3333-3333-333333333333'
AGENT='44444444-4444-4444-4444-444444444444'
RID='aaaaaaaa-0000-0000-0000-000000000001'

t() { # t <name> <who> <sql> <expected>
  local name="$1" who="$2" sql="$3" want="$4" got rc
  case "$who" in
    ANON)   got=$(docker exec "$CONTAINER" psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 -t -A \
                    -c "set role anon;" -c "$sql" 2>&1); rc=$? ;;
    OWNER)  got=$(docker exec "$CONTAINER" psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 -t -A \
                    -c "$sql" 2>&1); rc=$? ;;
    *)      got=$(docker exec "$CONTAINER" psql -U postgres -d "$DB" -v ON_ERROR_STOP=1 -t -A \
                    -c "set role authenticated;" \
                    -c "set request.jwt.claim.sub='$who';" -c "$sql" 2>&1); rc=$? ;;
  esac
  got=$(printf '%s' "$got" | grep -v '^SET$' | tail -1)

  if [ "$want" = "ERROR" ]; then
    if [ $rc -ne 0 ]; then echo "PASS  $name"; PASS=$((PASS+1))
    else echo "FAIL  $name  (expected refusal, succeeded: '$got')"; FAIL=$((FAIL+1)); fi
  elif [ "$got" = "$want" ]; then echo "PASS  $name"; PASS=$((PASS+1))
  else echo "FAIL  $name  (wanted '$want', got '$got')"; FAIL=$((FAIL+1)); fi
}

echo ""
echo "=== CAN THEY READ? ==="
t "customer A sees only their own orders"     "$ACUST" "select count(*) from orders;" "1"
t "customer B sees only their own orders"     "$BCUST" "select count(*) from orders;" "1"
t "agent sees the order assigned to them"     "$AGENT" "select count(*) from orders;" "1"
t "agent does NOT see unassigned orders"      "$AGENT" "select count(*) from orders where agent_id is null;" "0"
t "anon sees only ACTIVE restaurants"         "ANON"   "select count(*) from restaurants;" "1"
t "anon sees only AVAILABLE menu items"       "ANON"   "select count(*) from menu_items;" "1"
t "anon reads the delivery area list"         "ANON"   "select count(*) from delivery_areas;" "1"
t "anon reads settings (fees + bank details)" "ANON"   "select count(*) from settings;" "1"
t "customer reads own profile only"           "$ACUST" "select count(*) from profiles;" "1"
t "customer reads own order items only"       "$ACUST" "select count(*) from order_items;" "1"
t "customer B cannot read A's order items"    "$BCUST" "select count(*) from order_items;" "0"
t "admin sees every profile"                  "$ADMIN" "select count(*) from profiles;" "4"
t "customer A sees only their own cart" "$ACUST" "select count(*) from carts;" "1"
t "customer B cannot see A cart items" "$BCUST" "select count(*) from cart_items;" "0"
t "anon cannot see any carts" "ANON" "select count(*) from carts;" "0"
t "admin sees every order"                    "$ADMIN" "select count(*) from orders;" "2"

echo ""
echo "=== MUST BE REFUSED ==="
t "customer cannot insert an order directly"   "$ACUST" "insert into orders (customer_id,restaurant_id,customer_name,customer_phone,delivery_address,food_subtotal,delivery_fee,service_fee,total) values ('$ACUST','$RID','x','+2348000000002','Ikeja',1,1,0,2);" "ERROR"
t "anon cannot insert an order"                "ANON"   "insert into orders (customer_id,restaurant_id,customer_name,customer_phone,delivery_address,food_subtotal,delivery_fee,service_fee,total) values ('$ACUST','$RID','x','+2348000000002','Ikeja',1,1,0,2);" "ERROR"
t "customer cannot promote themselves to admin" "$ACUST" "update profiles set role='admin' where id='$ACUST';" "ERROR"
t "customer cannot edit someone else's profile" "$ACUST" "update profiles set full_name='x' where id='$BCUST';" "UPDATE 0"
t "agent cannot change the money on an order"  "$AGENT" "update orders set total=1 where agent_id='$AGENT';" "ERROR"
t "agent cannot skip status steps" "$AGENT" "update orders set status='delivered' where agent_id='$AGENT';" "ERROR"
t "agent cannot move backwards" "$AGENT" "update orders set status='received' where agent_id='$AGENT';" "ERROR"
t "agent cannot cancel an order" "$AGENT" "update orders set status='cancelled' where agent_id='$AGENT';" "ERROR"
t "agent cannot change details with the status" "$AGENT" "update orders set status='picked_up', total=1 where agent_id='$AGENT';" "ERROR"
t "agent cannot edit an unassigned order"      "$AGENT" "update orders set status='delivered' where agent_id is null;" "UPDATE 0"
t "agent cannot change a menu price"           "$AGENT" "update menu_items set price=1 where restaurant_id='$RID';" "UPDATE 0"
t "anon cannot change a fee"                   "ANON"   "update settings set delivery_fee=0 where id=1;" "UPDATE 0"
t "customer cannot write order items"          "$ACUST" "update order_items set unit_price=1;" "UPDATE 0"
t "admin cannot assign a customer as an agent" "$ADMIN" "update orders set agent_id='$ACUST' where id='bbbbbbbb-0000-0000-0000-000000000002';" "ERROR"
t "admin cannot assign an agent before payment is confirmed" "$ADMIN" "update orders set agent_id='$AGENT' where id='bbbbbbbb-0000-0000-0000-000000000002';" "ERROR"
t "agent cannot assign themselves to an order" "$AGENT" "update orders set agent_id='$AGENT' where id='bbbbbbbb-0000-0000-0000-000000000002';" "UPDATE 0"

echo ""
echo "=== MUST SUCCEED ==="
t "admin CAN confirm payment on order 2" "$ADMIN" "update orders set payment_confirmed_at=now(), status='confirmed' where id='bbbbbbbb-0000-0000-0000-000000000002';" "UPDATE 1"
t "agent CAN advance one step"   "$AGENT" "update orders set status='agent_buying' where agent_id='$AGENT';" "UPDATE 1"
t "customer CAN update their own name" "$ACUST" "update profiles set full_name='Chidi' where id='$ACUST';" "UPDATE 1"
t "admin CAN confirm payment"      "$ADMIN" "update orders set payment_confirmed_at=now(), status='confirmed' where id='bbbbbbbb-0000-0000-0000-000000000001';" "UPDATE 1"
t "admin CAN assign an agent"      "$ADMIN" "update orders set agent_id='$AGENT' where id='bbbbbbbb-0000-0000-0000-000000000002';" "UPDATE 1"
t "admin CAN unassign an agent" "$ADMIN" "update orders set agent_id=null where id='bbbbbbbb-0000-0000-0000-000000000002';" "UPDATE 1"
t "admin CAN change a fee"         "$ADMIN" "update settings set delivery_fee=700 where id=1;" "UPDATE 1"
t "owner in dashboard CAN change a role" "OWNER" "update profiles set role='agent' where id='$BCUST';" "UPDATE 1"

echo ""
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
