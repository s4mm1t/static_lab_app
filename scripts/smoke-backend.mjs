const baseUrl = (process.env.API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const requireReady = process.env.SMOKE_REQUIRE_DEPLOYMENT_READY === "true";
const email = `smoke-${Date.now()}@example.com`;
const password = "SmokePass123";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-client-timezone": process.env.TZ || "Europe/Madrid",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const detail = typeof body === "string" ? body : JSON.stringify(body);
    throw new Error(`${options.method || "GET"} ${path} failed with ${response.status}: ${detail}`);
  }

  return body;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function note(label, value) {
  console.log(`${label}: ${value}`);
}

async function main() {
  note("Target", baseUrl);

  const status = await request("/api/v1/status");
  assert(status.name === "static_lab", "status.name must be static_lab");
  note("Storage", status.storage);
  note("AI provider", status.ai_provider_configured ? "configured" : "fallback");
  note("Deployment ready", status.deployment_ready ? "yes" : "no");

  if (Array.isArray(status.warnings) && status.warnings.length) {
    console.log("Warnings:");
    for (const warning of status.warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (requireReady) {
    assert(status.deployment_ready === true, "deployment_ready must be true");
    assert(status.storage === "postgres", "production storage must be postgres");
    assert(status.ai_provider_configured === true, "AI provider must be configured");
  }

  const auth = await request("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Smoke User",
      email,
      password,
      calorie_goal: 2100,
      activity_level: "active",
      weight_kg: 78,
      height_cm: 182,
      diet_type: "muscle",
    }),
  });
  assert(auth.token, "register must return token");
  assert(auth.profile?.email === email, "register must return the created profile");
  note("Registered", auth.profile.email);

  const authHeaders = { Authorization: `Bearer ${auth.token}` };

  const foods = await request("/api/v1/foods?q=chicken&limit=5", { headers: authHeaders });
  assert(Array.isArray(foods), "foods response must be an array");
  assert(foods.length > 0, "food search must return at least one product");
  note("Food match", foods[0].name);

  const meal = await request("/api/v1/meals", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      food_id: foods[0].id,
      meal_slot: "lunch",
      serving_multiplier: 1,
      note: "Smoke test meal",
    }),
  });
  assert(meal.id, "meal create must return id");
  note("Meal logged", `${meal.food.name} (${meal.calories} kcal)`);

  const meals = await request("/api/v1/meals", { headers: authHeaders });
  assert(Array.isArray(meals), "meals response must be an array");
  assert(meals.some((item) => item.id === meal.id), "created meal must be visible in diary");
  note("Diary count", meals.length);

  const coach = await request("/api/v1/assistant/messages", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      message: "что съесть после тренировки?",
      client_context: "Today totals in mobile UI: 185 kcal, protein 14g, carbs 22g, fat 5g\nToday remaining in mobile UI: 1915 kcal\ngoal 2100 kcal",
    }),
  });
  assert(coach.role === "assistant", "coach must return assistant message");
  assert(typeof coach.content === "string" && coach.content.length > 20, "coach reply must not be empty");
  assert(!coach.content.toLowerCase().includes("what to do now"), "Russian coach reply must not use English section labels");
  note("Coach reply", coach.content.replace(/\s+/g, " ").slice(0, 160));

  console.log("Smoke backend OK");
}

main().catch((error) => {
  console.error(`Smoke backend failed: ${error.message}`);
  process.exit(1);
});
