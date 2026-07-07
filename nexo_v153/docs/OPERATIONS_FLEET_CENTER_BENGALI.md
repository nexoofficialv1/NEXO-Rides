# NEXO Ride Operations + Fleet Center

এই module Main Admin-কে পুরো Toto fleet এক জায়গায় monitor করতে সাহায্য করবে।

## কী দেখা যাবে
- কতজন driver approved / pending / suspended
- কতজন online / offline
- কতজন idle / busy
- active ride queue
- area-wise demand vs available driver
- driver document expiry alert placeholder
- approved driver offline alert

## Admin Action
- Driver suspend
- Driver reactivate
- Driver force offline

## Production Note
Real launch-এর সময় live GPS stream, PostgreSQL database এবং background job দিয়ে fleet status auto-refresh করা উচিত।
