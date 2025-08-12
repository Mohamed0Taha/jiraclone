export async function loadAISuggestions(projectId, max = 8) {
  try {
    const url = route("tasks.ai.suggestions", projectId) + `?max=${encodeURIComponent(max)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data || !Array.isArray(data.suggestions)) return [];
    return data.suggestions.filter((s) => typeof s === "string" && s.trim() !== "");
  } catch (e) {
    console.error("AI suggestions error:", e);
    return [];
  }
}
