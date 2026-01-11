const getBaseUrl = () => {
    let url = process.env.NEXT_PUBLIC_API_URL || "https://applicompndrc-production.up.railway.app";
    // Remove trailing slashes
    url = url.replace(/\/+$/, "");
    // Remove trailing /api if present (to avoid double /api/api)
    url = url.replace(/\/api$/, "");
    return url;
};

export const API_BASE_URL = getBaseUrl();
