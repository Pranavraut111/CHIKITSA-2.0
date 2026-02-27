import { useEffect, useState, useRef } from "react";

export default function MapPage() {
    const [position, setPosition] = useState<[number, number] | null>(null);
    const [stores, setStores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("supermarket");
    const [error, setError] = useState("");
    const mapRef = useRef<any>(null);
    const [MapComponents, setMapComponents] = useState<any>(null);

    useEffect(() => {
        // Dynamically import leaflet and react-leaflet to avoid SSR issues
        Promise.all([
            import("react-leaflet"),
            import("leaflet"),
        ]).then(([rl, L]) => {
            // Fix default marker icon
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            });
            setMapComponents({ MapContainer: rl.MapContainer, TileLayer: rl.TileLayer, Marker: rl.Marker, Popup: rl.Popup });
        });
    }, []);

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (pos) => { setPosition([pos.coords.latitude, pos.coords.longitude]); },
            () => { setPosition([19.076, 72.8777]); /* Mumbai fallback */ }
        );
    }, []);

    useEffect(() => {
        if (!position) return;
        setLoading(true); setError("");
        const [lat, lon] = position;
        const radius = 3000;
        const q = `[out:json];node["shop"="${filter}"](around:${radius},${lat},${lon});out body 30;`;
        fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`)
            .then(r => r.json())
            .then(d => { setStores(d.elements || []); setLoading(false); })
            .catch(() => { setError("Failed to fetch stores."); setLoading(false); });
    }, [position, filter]);

    const FILTERS = [
        { value: "supermarket", label: "Supermarkets" },
        { value: "greengrocer", label: "Vegetable Shops" },
        { value: "convenience", label: "Convenience" },
        { value: "bakery", label: "Bakeries" },
    ];

    return (
        <div className="space-y-4">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Nearby Stores</h1>
            <div className="flex gap-2 flex-wrap">
                {FILTERS.map(f => (
                    <button key={f.value} onClick={() => setFilter(f.value)}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-colors
                        ${filter === f.value ? "bg-green-600 text-white border-green-600" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-800"}`}>
                        {f.label}
                    </button>
                ))}
            </div>
            {error && <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>}
            <div className="relative w-full h-[400px] sm:h-[500px] rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
                {(!position || !MapComponents) ? (
                    <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-900">
                        <div className="w-6 h-6 rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-green-600 animate-spin" />
                    </div>
                ) : (
                    <>
                        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                        <MapComponents.MapContainer center={position} zoom={14} style={{ height: "100%", width: "100%" }} ref={mapRef}>
                            <MapComponents.TileLayer attribution='© OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <MapComponents.Marker position={position}>
                                <MapComponents.Popup>📍 You are here</MapComponents.Popup>
                            </MapComponents.Marker>
                            {stores.map((s: any) => (
                                <MapComponents.Marker key={s.id} position={[s.lat, s.lon]}>
                                    <MapComponents.Popup>
                                        <strong>{s.tags?.name || "Store"}</strong>
                                        {s.tags?.["addr:street"] && <br />}
                                        {s.tags?.["addr:street"]}
                                    </MapComponents.Popup>
                                </MapComponents.Marker>
                            ))}
                        </MapComponents.MapContainer>
                        {loading && <div className="absolute top-3 right-3 bg-white dark:bg-slate-900 rounded-full p-2 shadow"><div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-green-600 animate-spin" /></div>}
                    </>
                )}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">{stores.length} stores found within 3 km</p>
        </div>
    );
}
