# NEXO Ride v1.0.33 V34 — Fare + Area Control Center

## Added
- Main Admin Web App > Control tab.
- Fare rule control: Full booking, sharing seat fare, base km, extra step km, extra fare, sharing capacity.
- Commission control: platform commission percent and Sub Admin share percent.
- Service area/geofence control: Kalna Sub-Division bounds, road multiplier, service points, geofence enable/disable.
- Area Catalog: create, activate, deactivate localities for Sub Admin/business tracking.

## APIs
- `POST /api/admin/fare`
- `POST /api/admin/service-area`
- `GET /api/admin/areas`
- `POST /api/admin/areas`
- `POST /api/admin/areas/:id/activate`
- `POST /api/admin/areas/:id/deactivate`

## Notes
- Sub Admin commission is still calculated from platform commission only.
- Control changes are saved in persistent database.
