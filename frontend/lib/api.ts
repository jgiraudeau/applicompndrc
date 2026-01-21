const getBaseUrl = () => {
    let url = process.env.NEXT_PUBLIC_API_URL || "https://applicompndrc-production.up.railway.app";
    // Remove trailing slashes
    url = url.replace(/\/+$/, "");

    // Ensure we don't duplicate /api if already present in env
    // But we DO want the base url to end with /api usually for this helper?
    // Actually, looking at usages: `${API_BASE_URL}/api/auth/token` -> implies base shouldn't have /api
    // BUT `NEXT_PUBLIC_API_URL` is defined as `.../api` in .env.local

    // Fix: If the env `NEXT_PUBLIC_API_URL` ends in `/api`, we should keep it OR adapt usages.
    // The previous code removed `/api` from the end.
    // Let's stick to the convention: API_BASE_URL should conform to what the app expects.
    // Most usages seem to assume NO /api suffix if they append /api/... manually?
    // Let's check a usage example from previous context: `${API_BASE_URL}/api/stripe...`
    // So API_BASE_URL should be the HOST (e.g. http://localhost:8000), NOT host/api.

    // If env var has /api, remove it.
    url = url.replace(/\/api$/, "");
    return url;
};

export const API_BASE_URL = getBaseUrl();
