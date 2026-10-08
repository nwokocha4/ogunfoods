"use client";

// Holds which step of signing in we are on: the phone number screen or
// the code screen, and the number the code was sent to.
import { useState } from "react";
import { PhoneStep } from "./phone-step";
import { OtpStep } from "./otp-step";

export function LoginFlow() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState(""); // already in +234 form

  if (step === "phone") {
    return (
      <PhoneStep
        onCodeSent={(e164) => {
          setPhone(e164);
          setStep("otp");
        }}
      />
    );
  }

  return <OtpStep phone={phone} onBack={() => setStep("phone")} />;
}