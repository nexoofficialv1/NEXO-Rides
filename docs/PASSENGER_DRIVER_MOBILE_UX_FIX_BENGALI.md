# NEXO Ride - Passenger/Driver Mobile UX Fix (Bengali)

এই update-এ Passenger এবং Driver app mobile screen-এর জন্য আরও stable করা হয়েছে।

## কী কী ঠিক হয়েছে

1. Bottom menu এখন swipe করা যাবে। ছোট মোবাইলে button চাপতে সুবিধা হবে।
2. Android navigation bar-এর উপর content ঢাকা পড়বে না।
3. Header sticky কিন্তু compact করা হয়েছে।
4. Card, row, button, input, KYC upload box ছোট screen অনুযায়ী adjust হবে।
5. Profile থেকে **Install App / Home Screen** করা যাবে।
6. পুরনো UI দেখালে Profile থেকে **Clear Cache / Update App** করা যাবে।
7. PWA shortcut ready: Book Toto, My Rides, Support।

## Testing

Passenger side খুলুন:

```text
http://127.0.0.1:3333/app/
```

Profile tab খুলে দেখবেন:
- Install App / Home Screen
- Clear Cache / Update App

Driver demo login করে online button, ride request tab, KYC upload section check করবেন।
