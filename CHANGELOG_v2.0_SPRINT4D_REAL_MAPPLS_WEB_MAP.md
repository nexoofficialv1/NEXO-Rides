# NEXO Ride v2.0 Sprint-4D Real Mappls Web Map

- Real Mappls Web JS SDK loader added.
- `/api/maps/public-config` added for authenticated app map loading.
- Pickup/Drop map modal now attempts real Mappls map tiles and markers.
- Route preview shows real map canvas with Pickup/Drop markers.
- Ride cards use live map canvas where possible.
- Search first tries Mappls search plugin, then local service point fallback.
- Fallback remains only when key/domain/SDK is not configured or blocked.
