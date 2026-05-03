"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";
type ActivityLevel = "light" | "balanced" | "active";
type AuthMode = "register" | "login";
type TabId = "home" | "diary" | "search" | "calendar" | "insights" | "profile";
type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";
type CalendarEventType = "meal" | "training" | "task" | "note";
type CalendarEventStatus = "planned" | "done" | "skipped";

type FoodItem = {
  id: string;
  name: string;
  detail: string;
  meal: "Breakfast" | "Lunch" | "Dinner";
  image: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  color: string;
  brand?: string | null;
  store?: string | null;
  barcode?: string | null;
  serving_label?: string | null;
  price?: number | null;
  currency?: string | null;
  source?: string;
};

type PublicProfile = {
  id: string;
  name: string;
  email: string;
  calorie_goal: number;
  activity_level: ActivityLevel;
  created_at: string;
};

type MealLog = {
  id: string;
  food: FoodItem;
  meal_slot: MealSlot;
  serving_multiplier: number;
  logged_at: string;
  note: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
};

type CalendarEvent = {
  id: string;
  user_id: string;
  event_type: CalendarEventType;
  title: string;
  scheduled_date: string;
  scheduled_time: string | null;
  status: CalendarEventStatus;
  accent: string;
  linked_meal_id: string | null;
  created_at: string;
  updated_at: string;
};

type NutritionEstimate = {
  food_id: string;
  label: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  confidence: number;
  note: string;
};

type AuthResponse = {
  token: string;
  profile: PublicProfile;
};

type AuthFormState = {
  name: string;
  email: string;
  password: string;
  calorieGoal: string;
  activityLevel: ActivityLevel;
};

const PRODUCT_PAGE_SIZE = 160;

const tabs: { id: TabId; label: string; short: string }[] = [
  { id: "home", label: "Main", short: "Main" },
  { id: "diary", label: "Diary", short: "Diary" },
  { id: "search", label: "Add food", short: "Add" },
  { id: "calendar", label: "Calendar", short: "Plan" },
  { id: "insights", label: "Insights", short: "Stats" },
  { id: "profile", label: "Profile", short: "Me" },
];

const mealSlots: {
  id: MealSlot;
  label: string;
  hint: string;
  accent: string;
}[] = [
  { id: "breakfast", label: "Breakfast", hint: "Start clean", accent: "#4f86f7" },
  { id: "lunch", label: "Lunch", hint: "Main fuel", accent: "#2bb673" },
  { id: "dinner", label: "Dinner", hint: "Close the day", accent: "#ff795e" },
  { id: "snack", label: "Snack", hint: "Small bites", accent: "#d59b2d" },
];

const fallbackFoods: FoodItem[] = [
  {
    id: "chicken-bowl",
    name: "Chicken rice bowl",
    detail: "grilled chicken, jasmine rice, avocado, salsa",
    meal: "Lunch",
    image: "/meal-chicken-rice-bowl.jpg",
    calories: 612,
    protein_g: 48,
    carbs_g: 68,
    fat_g: 19,
    fiber_g: 8,
    color: "#2bb673",
    serving_label: "1 bowl",
    source: "seed",
  },
  {
    id: "yogurt-berries",
    name: "Greek yogurt berries",
    detail: "plain Greek yogurt, blueberries, raspberries, honey",
    meal: "Breakfast",
    image: "/meal-yogurt-berries.jpg",
    calories: 238,
    protein_g: 20,
    carbs_g: 28,
    fat_g: 4,
    fiber_g: 5,
    color: "#4f86f7",
    serving_label: "1 bowl",
    source: "seed",
  },
  {
    id: "salmon-avocado",
    name: "Salmon avocado plate",
    detail: "baked salmon, avocado, potatoes, cucumber",
    meal: "Dinner",
    image: "/meal-salmon-avocado.jpg",
    calories: 540,
    protein_g: 39,
    carbs_g: 22,
    fat_g: 31,
    fiber_g: 9,
    color: "#ff795e",
    serving_label: "1 plate",
    source: "seed",
  },
];

const activityLabels: Record<ActivityLevel, string> = {
  light: "Light",
  balanced: "Balanced",
  active: "Active",
};

const eventTypes: {
  id: CalendarEventType;
  label: string;
  accent: string;
}[] = [
  { id: "meal", label: "Meal", accent: "#2bb673" },
  { id: "training", label: "Training", accent: "#4f86f7" },
  { id: "task", label: "Task", accent: "#d59b2d" },
  { id: "note", label: "Note", accent: "#ff795e" },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatKcal(value: number) {
  return `${Math.round(value).toLocaleString()} kcal`;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function shortWeekday(date: Date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
}

function money(food: FoodItem) {
  if (food.price == null) {
    return null;
  }
  const currency = food.currency === "EUR" || !food.currency ? "EUR" : food.currency;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(food.price);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function safeInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const response = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let detail = `Request failed with ${response.status}`;
    try {
      const payload = (await response.json()) as { detail?: string };
      detail = payload.detail ?? detail;
    } catch {
      // Keep status message.
    }
    throw new Error(detail);
  }

  return (await response.json()) as T;
}

function getApiBase() {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (typeof window === "undefined") {
    return configured ?? "http://127.0.0.1:8000";
  }

  const { protocol, hostname } = window.location;
  if (
    configured &&
    !configured.includes("localhost") &&
    !configured.includes("127.0.0.1")
  ) {
    return configured;
  }

  return `${protocol}//${hostname}:8000`;
}

function readStoredProfile() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem("trackfood-profile");
    return raw ? (JSON.parse(raw) as PublicProfile) : null;
  } catch {
    return null;
  }
}

function FoodVisual({ food, size = "md" }: { food: FoodItem; size?: "sm" | "md" | "lg" }) {
  const canUseNextImage = food.image.startsWith("/");

  return (
    <span className={`food-visual ${size}`} style={{ "--accent": food.color } as CSSProperties}>
      {canUseNextImage ? (
        <Image src={food.image} alt="" fill sizes="96px" />
      ) : (
        <span>{safeInitials(food.brand || food.store || food.name) || "TF"}</span>
      )}
    </span>
  );
}

function ThemeToggle({
  theme,
  onChange,
}: {
  theme: Theme;
  onChange: (theme: Theme) => void;
}) {
  return (
    <div className="theme-toggle" aria-label="Theme">
      {(["light", "dark"] as Theme[]).map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={theme === item}
          className={theme === item ? "is-active" : ""}
          onClick={() => onChange(item)}
        >
          {item === "light" ? "Light" : "Dark"}
        </button>
      ))}
    </div>
  );
}

function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="stat-tile">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function MacroLine({
  label,
  value,
  goal,
  color,
}: {
  label: string;
  value: number;
  goal: number;
  color: string;
}) {
  const percent = clamp(Math.round((value / goal) * 100), 0, 100);
  return (
    <div className="macro-line">
      <div>
        <span>{label}</span>
        <strong>{value}g</strong>
      </div>
      <span className="macro-track">
        <span style={{ width: `${percent}%`, backgroundColor: color }} />
      </span>
    </div>
  );
}

function MealSection({
  slot,
  meals,
  onAdd,
  onDelete,
}: {
  slot: (typeof mealSlots)[number];
  meals: MealLog[];
  onAdd: (slot: MealSlot) => void;
  onDelete: (mealId: string) => void;
}) {
  const totals = meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + meal.protein_g,
      carbs: acc.carbs + meal.carbs_g,
      fat: acc.fat + meal.fat_g,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <section className="meal-section">
      <div className="meal-head">
        <div>
          <span style={{ backgroundColor: slot.accent }} />
          <div>
            <h3>{slot.label}</h3>
            <small>{meals.length ? formatKcal(totals.calories) : slot.hint}</small>
          </div>
        </div>
        <button type="button" aria-label={`Add ${slot.label}`} onClick={() => onAdd(slot.id)}>
          +
        </button>
      </div>

      <div className="meal-items">
        {meals.length ? (
          meals.map((meal) => (
            <article className="meal-row" key={meal.id}>
              <FoodVisual food={meal.food} size="sm" />
              <div>
                <strong>{meal.food.name}</strong>
                <small>
                  {meal.food.brand || meal.food.store || meal.food.serving_label || "Food"} -
                  {" "}{formatKcal(meal.calories)}
                </small>
              </div>
              <button type="button" onClick={() => onDelete(meal.id)}>
                Remove
              </button>
            </article>
          ))
        ) : (
          <button type="button" className="empty-meal" onClick={() => onAdd(slot.id)}>
            Add food to {slot.label.toLowerCase()}
          </button>
        )}
      </div>
    </section>
  );
}

function ProductRow({
  food,
  onSelect,
}: {
  food: FoodItem;
  onSelect: (food: FoodItem) => void;
}) {
  return (
    <button type="button" className="product-row" onClick={() => onSelect(food)}>
      <FoodVisual food={food} />
      <span className="product-main">
        <strong>{food.name}</strong>
        <small>
          {[food.brand, food.store, food.serving_label].filter(Boolean).join(" - ") ||
            food.detail}
        </small>
        <span className="product-tags">
          <em>{formatKcal(food.calories)}</em>
          <em>P {food.protein_g}g</em>
          <em>C {food.carbs_g}g</em>
          <em>F {food.fat_g}g</em>
        </span>
      </span>
      <span className="add-dot">+</span>
    </button>
  );
}

function PlannerCalendar({
  selectedDate,
  monthDate,
  events,
  meals,
  onSelectDate,
  onMonthChange,
}: {
  selectedDate: string;
  monthDate: Date;
  events: CalendarEvent[];
  meals: MealLog[];
  onSelectDate: (date: string) => void;
  onMonthChange: (date: Date) => void;
}) {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = addDays(monthStart, -monthStart.getDay());
  const selectedEvents = events.filter((event) => event.scheduled_date === selectedDate);
  const selectedMeals = meals.filter((meal) => meal.logged_at.slice(0, 10) === selectedDate);

  return (
    <section className="panel calendar-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Calendar</span>
          <h2>{monthLabel(monthDate)}</h2>
        </div>
        <div className="calendar-controls">
          <button type="button" onClick={() => onMonthChange(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))}>
            Prev
          </button>
          <button type="button" onClick={() => onMonthChange(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))}>
            Next
          </button>
        </div>
      </div>

      <div className="calendar-weekdays">
        {Array.from({ length: 7 }).map((_, index) => (
          <span key={index}>{shortWeekday(addDays(gridStart, index)).slice(0, 2)}</span>
        ))}
      </div>

      <div className="month-grid">
        {Array.from({ length: 42 }).map((_, index) => {
          const day = addDays(gridStart, index);
          const key = dateKey(day);
          const dayEvents = events.filter((event) => event.scheduled_date === key);
          const dayMeals = meals.filter((meal) => meal.logged_at.slice(0, 10) === key);
          const isMuted = day.getMonth() !== monthDate.getMonth();
          const isSelected = key === selectedDate;

          return (
            <button
              key={key}
              type="button"
              className={[
                "calendar-day",
                isMuted ? "is-muted" : "",
                isSelected ? "is-selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSelectDate(key)}
            >
              <span>{day.getDate()}</span>
              <small>
                {dayMeals.length > 0 && <i style={{ backgroundColor: "#2bb673" }} />}
                {dayEvents.slice(0, 3).map((event) => (
                  <i key={event.id} style={{ backgroundColor: event.accent }} />
                ))}
              </small>
            </button>
          );
        })}
      </div>

      <div className="agenda-list">
        <span className="eyebrow">{selectedDate}</span>
        {selectedMeals.map((meal) => (
          <article key={meal.id} className="agenda-row">
            <i style={{ backgroundColor: "#2bb673" }} />
            <div>
              <strong>{meal.food.name}</strong>
              <small>{meal.meal_slot} - {formatKcal(meal.calories)}</small>
            </div>
          </article>
        ))}
        {selectedEvents.map((event) => (
          <article key={event.id} className={`agenda-row status-${event.status}`}>
            <i style={{ backgroundColor: event.accent }} />
            <div>
              <strong>{event.title}</strong>
              <small>
                {event.scheduled_time || "All day"} - {event.event_type} - {event.status}
              </small>
            </div>
          </article>
        ))}
        {!selectedMeals.length && !selectedEvents.length && (
          <div className="empty-state compact">
            <strong>No plans yet</strong>
            <span>Add a task, workout, note, or meal marker for this day.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function HomeAction({
  label,
  title,
  detail,
  onClick,
}: {
  label: string;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="home-action" onClick={onClick}>
      <span>{label}</span>
      <strong>{title}</strong>
      <small>{detail}</small>
    </button>
  );
}

function AuthFormCard({
  authMode,
  authForm,
  status,
  onAuthModeChange,
  onAuthFormChange,
  onSubmit,
}: {
  authMode: AuthMode;
  authForm: AuthFormState;
  status: string;
  onAuthModeChange: (mode: AuthMode) => void;
  onAuthFormChange: (updater: (current: AuthFormState) => AuthFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <>
      <div className="auth-tabs" aria-label="Authentication mode">
        {(["register", "login"] as AuthMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            className={authMode === mode ? "is-active" : ""}
            onClick={() => onAuthModeChange(mode)}
          >
            {mode === "register" ? "Register" : "Login"}
          </button>
        ))}
      </div>

      <form className="auth-form" onSubmit={onSubmit}>
        {authMode === "register" && (
          <label>
            Name
            <input
              required
              minLength={2}
              maxLength={80}
              value={authForm.name}
              onChange={(event) =>
                onAuthFormChange((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Nika Stone"
            />
          </label>
        )}
        <label>
          Email
          <input
            required
            type="email"
            value={authForm.email}
            onChange={(event) =>
              onAuthFormChange((current) => ({ ...current, email: event.target.value }))
            }
            placeholder="nika@trackfood.ai"
          />
        </label>
        <label>
          Password
          <input
            required
            type="password"
            minLength={8}
            value={authForm.password}
            onChange={(event) =>
              onAuthFormChange((current) => ({
                ...current,
                password: event.target.value,
              }))
            }
            placeholder="8+ characters"
          />
        </label>
        {authMode === "register" && (
          <div className="form-pair">
            <label>
              Daily goal
              <input
                required
                type="number"
                min={1000}
                max={6000}
                value={authForm.calorieGoal}
                onChange={(event) =>
                  onAuthFormChange((current) => ({
                    ...current,
                    calorieGoal: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Activity
              <select
                value={authForm.activityLevel}
                onChange={(event) =>
                  onAuthFormChange((current) => ({
                    ...current,
                    activityLevel: event.target.value as ActivityLevel,
                  }))
                }
              >
                <option value="light">Light</option>
                <option value="balanced">Balanced</option>
                <option value="active">Active</option>
              </select>
            </label>
          </div>
        )}
        <button type="submit" className="primary-button wide">
          {authMode === "register" ? "Create account" : "Login"}
        </button>
      </form>
      <p className="status-text">{status}</p>
    </>
  );
}

function GuestPreview({
  theme,
  status,
  authMode,
  authForm,
  onThemeChange,
  onAuthModeChange,
  onAuthFormChange,
  onSubmit,
}: {
  theme: Theme;
  status: string;
  authMode: AuthMode;
  authForm: AuthFormState;
  onThemeChange: (theme: Theme) => void;
  onAuthModeChange: (mode: AuthMode) => void;
  onAuthFormChange: (updater: (current: AuthFormState) => AuthFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <main className={`app-shell guest-shell theme-${theme}`}>
      <div className="ambient-stage" aria-hidden="true">
        <span className="ambient-plane plane-a" />
        <span className="ambient-plane plane-b" />
        <span className="ambient-plane plane-c" />
      </div>
      <section className="guest-content">
        <header className="guest-topbar">
          <a className="mobile-brand" href="#top">
            <span>TF</span>
            <strong>TrackFood AI</strong>
          </a>
          <ThemeToggle theme={theme} onChange={onThemeChange} />
        </header>

        <div className="guest-grid">
          <section className="guest-hero">
            <span className="eyebrow">Private food tracker</span>
            <h1>Nutrition, calendar, and progress in one clean app.</h1>
            <p>
              Without an account you can preview the product. Create a profile to unlock
              meal logging, product search, calendar planning, scanner tools, and synced data.
            </p>
            <div className="guest-preview-row">
              <StatTile label="Demo calories" value="1,420 kcal" detail="today" />
              <StatTile label="Planner" value="4 events" detail="sample day" />
              <StatTile label="Products" value="24k+" detail="local DB" />
            </div>
          </section>

          <section className="panel guest-auth-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Unlock app</span>
                <h2>{authMode === "register" ? "Create account" : "Welcome back"}</h2>
              </div>
            </div>
            <AuthFormCard
              authMode={authMode}
              authForm={authForm}
              status={status}
              onAuthModeChange={onAuthModeChange}
              onAuthFormChange={onAuthFormChange}
              onSubmit={onSubmit}
            />
          </section>
        </div>

        <section className="guest-demo">
          <article>
            <strong>Diary</strong>
            <span>Log breakfast, lunch, dinner, snacks, and servings.</span>
          </article>
          <article>
            <strong>Calendar</strong>
            <span>Plan meals, training, notes, and daily tasks.</span>
          </article>
          <article>
            <strong>Scanner</strong>
            <span>Barcode and photo estimate flow ready for mobile.</span>
          </article>
        </section>
      </section>
    </main>
  );
}

function BottomNav({
  activeTab,
  onNavigate,
}: {
  activeTab: TabId;
  onNavigate: (tab: TabId) => void;
}) {
  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          aria-current={activeTab === tab.id ? "page" : undefined}
          onClick={() => onNavigate(tab.id)}
        >
          <span aria-hidden="true" />
          {tab.short}
        </button>
      ))}
    </nav>
  );
}

export default function TrackFoodApp() {
  const [theme, setTheme] = useState<Theme>("light");
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [isRailOpen, setIsRailOpen] = useState(true);
  const [foods, setFoods] = useState<FoodItem[]>(fallbackFoods);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState("Starting");
  const [authMode, setAuthMode] = useState<AuthMode>("register");
  const [activeMealSlot, setActiveMealSlot] = useState<MealSlot>("breakfast");
  const [query, setQuery] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [isFoodListOpen, setIsFoodListOpen] = useState(false);
  const [foodOffset, setFoodOffset] = useState(0);
  const [canLoadMoreFoods, setCanLoadMoreFoods] = useState(true);
  const [quantity, setQuantity] = useState("1");
  const [estimateText, setEstimateText] = useState("");
  const [estimate, setEstimate] = useState<NutritionEstimate | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [monthDate, setMonthDate] = useState(new Date());
  const [calendarForm, setCalendarForm] = useState({
    event_type: "task" as CalendarEventType,
    title: "",
    scheduled_time: "",
  });
  const [barcodeText, setBarcodeText] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [scrollDepth, setScrollDepth] = useState(0);
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    calorieGoal: "1850",
    activityLevel: "balanced" as ActivityLevel,
  });

  const parsedGoal = Number(authForm.calorieGoal) || 1850;
  const goal = profile?.calorie_goal ?? parsedGoal;
  const totals = useMemo(
    () =>
      meals.reduce(
        (acc, meal) => ({
          calories: acc.calories + meal.calories,
          protein: acc.protein + meal.protein_g,
          carbs: acc.carbs + meal.carbs_g,
          fat: acc.fat + meal.fat_g,
          fiber: acc.fiber + meal.fiber_g,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      ),
    [meals],
  );
  const progress = clamp(Math.round((totals.calories / goal) * 100), 0, 140);
  const remaining = Math.max(goal - totals.calories, 0);
  const stores = useMemo(
    () =>
      Array.from(new Set(foods.map((food) => food.store).filter(Boolean))).slice(0, 8) as string[],
    [foods],
  );
  const recentFoods = useMemo(() => {
    const seen = new Set<string>();
    return meals
      .map((meal) => meal.food)
      .filter((food) => {
        if (seen.has(food.id)) {
          return false;
        }
        seen.add(food.id);
        return true;
      })
      .slice(0, 6);
  }, [meals]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const savedTheme = window.localStorage.getItem("trackfood-theme") as Theme | null;
      const savedToken = window.localStorage.getItem("trackfood-token");
      const savedProfile = readStoredProfile();
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

      setTheme(savedTheme ?? (prefersDark ? "dark" : "light"));
      setToken(savedToken);
      setProfile(savedProfile);

      if (savedProfile) {
        setAuthForm((current) => ({
          ...current,
          name: savedProfile.name,
          email: savedProfile.email,
          calorieGoal: String(savedProfile.calorie_goal),
          activityLevel: savedProfile.activity_level,
        }));
      }

      void apiRequest<FoodItem[]>(`/api/v1/foods?limit=${PRODUCT_PAGE_SIZE}`)
        .then((items) => {
          setFoods(items.length ? items : fallbackFoods);
          setFoodOffset(items.length);
          setCanLoadMoreFoods(items.length === PRODUCT_PAGE_SIZE);
          setStatus(items.length > 10 ? `${items.length} products ready` : "Product database ready");
        })
        .catch((error) => {
          setFoods(fallbackFoods);
          setStatus(getErrorMessage(error));
        });

      if (savedToken) {
        void apiRequest<MealLog[]>("/api/v1/meals", {}, savedToken)
          .then((remoteMeals) => {
            setMeals(remoteMeals);
            setStatus("Synced");
          })
          .catch((error) => setStatus(getErrorMessage(error)));
        const calendarAnchor = new Date();
        const start = dateKey(new Date(calendarAnchor.getFullYear(), calendarAnchor.getMonth(), 1));
        const end = dateKey(new Date(calendarAnchor.getFullYear(), calendarAnchor.getMonth() + 2, 0));
        void apiRequest<CalendarEvent[]>(
          `/api/v1/calendar/events?date_from=${start}&date_to=${end}`,
          {},
          savedToken,
        )
          .then(setCalendarEvents)
          .catch((error) => setStatus(getErrorMessage(error)));
      } else {
        setStatus("Create account to sync");
      }
      setIsHydrated(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("trackfood-theme", theme);
  }, [theme]);

  useEffect(() => {
    let frame = 0;
    const updateDepth = () => {
      frame = 0;
      setScrollDepth(Math.min(window.scrollY / 900, 1.4));
    };
    const onScroll = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(updateDepth);
      }
    };

    updateDepth();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  async function loadFoods(nextQuery = query, nextStore = storeFilter, nextOffset = 0) {
    const params = new URLSearchParams();
    if (nextQuery.trim()) {
      params.set("q", nextQuery.trim());
    }
    if (nextStore.trim()) {
      params.set("store", nextStore.trim());
    }
    params.set("limit", String(PRODUCT_PAGE_SIZE));
    params.set("offset", String(nextOffset));

    try {
      const items = await apiRequest<FoodItem[]>(`/api/v1/foods?${params.toString()}`);
      setFoods((current) =>
        nextOffset > 0 ? [...current, ...items] : items.length ? items : fallbackFoods,
      );
      setFoodOffset(nextOffset + items.length);
      setCanLoadMoreFoods(items.length === PRODUCT_PAGE_SIZE);
      setStatus(items.length > 10 ? `${nextOffset + items.length} products loaded` : "Product database ready");
    } catch (error) {
      setFoods(fallbackFoods);
      setStatus(getErrorMessage(error));
    }
  }

  async function loadMoreFoods() {
    await loadFoods(query, storeFilter, foodOffset);
  }

  async function refreshMeals(nextToken = token) {
    if (!nextToken) {
      return;
    }
    try {
      const remoteMeals = await apiRequest<MealLog[]>("/api/v1/meals", {}, nextToken);
      setMeals(remoteMeals);
      setStatus("Synced");
    } catch (error) {
      setStatus(getErrorMessage(error));
    }
  }

  async function refreshCalendar(nextToken = token, anchor = monthDate) {
    if (!nextToken) {
      setCalendarEvents([]);
      return;
    }
    const start = dateKey(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
    const end = dateKey(new Date(anchor.getFullYear(), anchor.getMonth() + 2, 0));
    try {
      const events = await apiRequest<CalendarEvent[]>(
        `/api/v1/calendar/events?date_from=${start}&date_to=${end}`,
        {},
        nextToken,
      );
      setCalendarEvents(events);
    } catch (error) {
      setStatus(getErrorMessage(error));
    }
  }

  function navigate(tab: TabId) {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function openAdd(slot: MealSlot) {
    setActiveMealSlot(slot);
    setIsFoodListOpen(false);
    navigate("search");
  }

  function chooseFood(food: FoodItem) {
    setSelectedFood(food);
    setIsFoodListOpen(false);
  }

  async function saveSelectedFood() {
    if (!selectedFood) {
      return;
    }
    if (!token) {
      setStatus("Register or login to save meals in the database");
      navigate("profile");
      return;
    }

    const serving_multiplier = clamp(Number(quantity) || 1, 0.1, 8);
    try {
      const meal = await apiRequest<MealLog>(
        "/api/v1/meals",
        {
          method: "POST",
          body: JSON.stringify({
            food_id: selectedFood.id,
            meal_slot: activeMealSlot,
            serving_multiplier,
          }),
        },
        token,
      );
      setMeals((current) => [meal, ...current]);
      setSelectedFood(null);
      setQuantity("1");
      setStatus("Added to diary");
      navigate("diary");
    } catch (error) {
      setStatus(getErrorMessage(error));
    }
  }

  async function deleteMeal(mealId: string) {
    if (!token) {
      return;
    }

    try {
      await apiRequest<{ status: string }>(
        `/api/v1/meals/${mealId}`,
        { method: "DELETE" },
        token,
      );
      setMeals((current) => current.filter((meal) => meal.id !== mealId));
      setStatus("Meal removed");
    } catch (error) {
      setStatus(getErrorMessage(error));
    }
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const endpoint =
      authMode === "register" ? "/api/v1/auth/register" : "/api/v1/auth/login";
    const body =
      authMode === "register"
        ? {
            name: authForm.name.trim(),
            email: authForm.email.trim().toLowerCase(),
            password: authForm.password,
            calorie_goal: clamp(Number(authForm.calorieGoal) || 1850, 1000, 6000),
            activity_level: authForm.activityLevel,
          }
        : {
            email: authForm.email.trim().toLowerCase(),
            password: authForm.password,
          };

    try {
      const payload = await apiRequest<AuthResponse>(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setToken(payload.token);
      setProfile(payload.profile);
      setAuthForm((current) => ({ ...current, password: "" }));
      window.localStorage.setItem("trackfood-token", payload.token);
      window.localStorage.setItem("trackfood-profile", JSON.stringify(payload.profile));
      setStatus(authMode === "register" ? "Account created" : "Logged in");
      await refreshMeals(payload.token);
      await refreshCalendar(payload.token);
      navigate("home");
    } catch (error) {
      setStatus(getErrorMessage(error));
    }
  }

  function logout() {
    setToken(null);
    setProfile(null);
    setMeals([]);
    setCalendarEvents([]);
    window.localStorage.removeItem("trackfood-token");
    window.localStorage.removeItem("trackfood-profile");
    setStatus("Logged out");
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadFoods(query, storeFilter);
    setIsFoodListOpen(true);
  }

  async function handleEstimate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (estimateText.trim().length < 2) {
      return;
    }

    try {
      const payload = await apiRequest<NutritionEstimate>("/api/v1/nutrition/estimate", {
        method: "POST",
        body: JSON.stringify({ description: estimateText }),
      });
      setEstimate(payload);
      const matches = await apiRequest<FoodItem[]>(
        `/api/v1/foods?q=${encodeURIComponent(payload.label)}&limit=8`,
      );
      if (matches[0]) {
        chooseFood(matches[0]);
      }
      setStatus("Estimate ready");
    } catch (error) {
      setStatus(getErrorMessage(error));
    }
  }

  async function handleCalendarSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setStatus("Login to save calendar events to your planner database");
      navigate("profile");
      return;
    }
    const eventType = eventTypes.find((item) => item.id === calendarForm.event_type) ?? eventTypes[2];

    try {
      const created = await apiRequest<CalendarEvent>(
        "/api/v1/calendar/events",
        {
          method: "POST",
          body: JSON.stringify({
            event_type: calendarForm.event_type,
            title: calendarForm.title.trim(),
            scheduled_date: selectedDate,
            scheduled_time: calendarForm.scheduled_time || null,
            accent: eventType.accent,
          }),
        },
        token,
      );
      setCalendarEvents((current) => [...current, created]);
      setCalendarForm((current) => ({ ...current, title: "", scheduled_time: "" }));
      setStatus("Calendar event saved");
    } catch (error) {
      setStatus(getErrorMessage(error));
    }
  }

  async function updateCalendarStatus(eventId: string, nextStatus: CalendarEventStatus) {
    if (!token) {
      return;
    }

    try {
      const updated = await apiRequest<CalendarEvent>(
        `/api/v1/calendar/events/${eventId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        },
        token,
      );
      setCalendarEvents((current) =>
        current.map((event) => (event.id === eventId ? updated : event)),
      );
    } catch (error) {
      setStatus(getErrorMessage(error));
    }
  }

  async function deleteCalendarEvent(eventId: string) {
    if (!token) {
      return;
    }

    try {
      await apiRequest<{ status: string }>(
        `/api/v1/calendar/events/${eventId}`,
        { method: "DELETE" },
        token,
      );
      setCalendarEvents((current) => current.filter((event) => event.id !== eventId));
      setStatus("Calendar event removed");
    } catch (error) {
      setStatus(getErrorMessage(error));
    }
  }

  async function handleBarcodeSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!barcodeText.trim()) {
      return;
    }
    setQuery(barcodeText.trim());
    setStoreFilter("");
    await loadFoods(barcodeText.trim(), "", 0);
    setIsFoodListOpen(true);
    navigate("search");
  }

  async function handlePhotoEstimate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const description = estimateText.trim() || "photo food estimate";
    setEstimateText(description);
    try {
      const payload = await apiRequest<NutritionEstimate>("/api/v1/nutrition/estimate", {
        method: "POST",
        body: JSON.stringify({ description }),
      });
      setEstimate(payload);
      setStatus("Photo trial estimate ready");
    } catch (error) {
      setStatus(getErrorMessage(error));
    }
  }

  if (isHydrated && (!token || !profile)) {
    return (
      <GuestPreview
        theme={theme}
        status={status}
        authMode={authMode}
        authForm={authForm}
        onThemeChange={setTheme}
        onAuthModeChange={setAuthMode}
        onAuthFormChange={setAuthForm}
        onSubmit={handleAuth}
      />
    );
  }

  return (
    <main
      className={`app-shell theme-${theme} ${isRailOpen ? "rail-open" : "rail-collapsed"}`}
      style={{ "--scroll-depth": scrollDepth } as CSSProperties}
    >
      <div className="ambient-stage" aria-hidden="true">
        <span className="ambient-plane plane-a" />
        <span className="ambient-plane plane-b" />
        <span className="ambient-plane plane-c" />
      </div>
      <aside className="rail">
        <div className="rail-head">
          <a className="brand" href="#home" onClick={() => navigate("home")}>
            <span>TF</span>
            <strong>TrackFood AI</strong>
          </a>
          <button
            type="button"
            className="rail-toggle"
            aria-label={isRailOpen ? "Collapse sidebar" : "Expand sidebar"}
            onClick={() => setIsRailOpen((current) => !current)}
          >
            {isRailOpen ? "‹" : "›"}
          </button>
        </div>
        <a className="brand rail-mini-brand" href="#home" onClick={() => navigate("home")}>
          <span>TF</span>
          <strong>TrackFood AI</strong>
        </a>
        <nav aria-label="Primary navigation">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-current={activeTab === tab.id ? "page" : undefined}
              onClick={() => navigate(tab.id)}
            >
              <span className="nav-label">{tab.label}</span>
              <span className="nav-short">{tab.short.slice(0, 1)}</span>
            </button>
          ))}
        </nav>
        <ThemeToggle theme={theme} onChange={setTheme} />
      </aside>

      <div className="app-content">
        <header className="topbar">
          <a className="mobile-brand" href="#home" onClick={() => navigate("home")}>
            <span>TF</span>
            <strong>{tabs.find((tab) => tab.id === activeTab)?.label ?? "TrackFood AI"}</strong>
          </a>
          <div className="topbar-actions">
            <span className={token ? "sync-pill online" : "sync-pill"}>
              {token ? "Account synced" : status}
            </span>
            <ThemeToggle theme={theme} onChange={setTheme} />
          </div>
        </header>

        {activeTab === "home" && (
          <section id="home" className="home-grid app-page">
            <div className="hero-card hero-main">
              <div className="hero-copy">
                <span className="eyebrow">Main menu</span>
                <h1>{formatKcal(totals.calories)}</h1>
                <p>
                  {profile
                    ? `${profile.name.split(" ")[0]}, ${formatKcal(remaining)} left today.`
                    : "Create your account and TrackFood AI will sync diary, plans, and meals."}
                </p>
              </div>
              <div
                className="calorie-orbit"
                style={{
                  background: `conic-gradient(var(--text) ${Math.min(
                    progress,
                    100,
                  )}%, var(--line-soft) 0)`,
                }}
              >
                <span>{progress}%</span>
              </div>
            </div>

            <section className="panel command-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Quick access</span>
                  <h2>Today&apos;s control room</h2>
                </div>
              </div>
              <div className="home-actions">
                <HomeAction
                  label="Diary"
                  title="Log meals"
                  detail={`${meals.length} meals today`}
                  onClick={() => navigate("diary")}
                />
                <HomeAction
                  label="Food DB"
                  title="Add product"
                  detail={`${foods.length} loaded`}
                  onClick={() => openAdd("breakfast")}
                />
                <HomeAction
                  label="Calendar"
                  title="Plan day"
                  detail={`${calendarEvents.filter((event) => event.scheduled_date === selectedDate).length} plans`}
                  onClick={() => navigate("calendar")}
                />
                <HomeAction
                  label="Scan"
                  title="Barcode/photo"
                  detail="Trial scanner"
                  onClick={() => navigate("insights")}
                />
              </div>
            </section>

            <section className="panel summary-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Daily summary</span>
                  <h2>{formatKcal(goal)} goal</h2>
                </div>
              </div>
              <div className="stats-grid">
                <StatTile label="Remaining" value={formatKcal(remaining)} detail="today" />
                <StatTile label="Meals" value={String(meals.length)} detail="logged" />
                <StatTile label="Fiber" value={`${totals.fiber}g`} detail="tracked" />
              </div>
              <div className="macro-stack">
                <MacroLine label="Protein" value={totals.protein} goal={140} color="#2bb673" />
                <MacroLine label="Carbs" value={totals.carbs} goal={240} color="#4f86f7" />
                <MacroLine label="Fat" value={totals.fat} goal={70} color="#ff795e" />
              </div>
            </section>
          </section>
        )}

        {activeTab === "diary" && (
        <section id="diary" className="diary-grid">
          <div className="hero-card">
            <div className="hero-copy">
              <span className="eyebrow">Today</span>
              <h1>{formatKcal(totals.calories)}</h1>
              <p>
                {profile
                  ? `${profile.name.split(" ")[0]}, ${formatKcal(remaining)} left.`
                  : "Create an account and every meal will stay in Postgres."}
              </p>
            </div>
            <div
              className="calorie-orbit"
              style={{
                background: `conic-gradient(var(--text) ${Math.min(
                  progress,
                  100,
                )}%, var(--line-soft) 0)`,
              }}
            >
              <span>{progress}%</span>
            </div>
          </div>

          <section className="panel diary-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Food diary</span>
                <h2>Log by meal</h2>
              </div>
              <button type="button" className="primary-button" onClick={() => openAdd("breakfast")}>
                Add food
              </button>
            </div>
            <div className="meal-stack">
              {mealSlots.map((slot) => (
                <MealSection
                  key={slot.id}
                  slot={slot}
                  meals={meals.filter((meal) => meal.meal_slot === slot.id)}
                  onAdd={openAdd}
                  onDelete={deleteMeal}
                />
              ))}
            </div>
          </section>

          <section className="panel summary-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Daily summary</span>
                <h2>{formatKcal(goal)} goal</h2>
              </div>
            </div>
            <div className="stats-grid">
              <StatTile label="Remaining" value={formatKcal(remaining)} detail="today" />
              <StatTile label="Meals" value={String(meals.length)} detail="logged" />
              <StatTile label="Fiber" value={`${totals.fiber}g`} detail="tracked" />
            </div>
            <div className="macro-stack">
              <MacroLine label="Protein" value={totals.protein} goal={140} color="#2bb673" />
              <MacroLine label="Carbs" value={totals.carbs} goal={240} color="#4f86f7" />
              <MacroLine label="Fat" value={totals.fat} goal={70} color="#ff795e" />
            </div>
          </section>
        </section>
        )}

        {activeTab === "calendar" && (
        <section id="calendar" className="planner-grid">
          <PlannerCalendar
            selectedDate={selectedDate}
            monthDate={monthDate}
            events={calendarEvents}
            meals={meals}
            onSelectDate={setSelectedDate}
            onMonthChange={(nextMonth) => {
              setMonthDate(nextMonth);
              void refreshCalendar(token, nextMonth);
            }}
          />

          <aside className="panel planner-side">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Plan day</span>
                <h2>{selectedDate}</h2>
              </div>
            </div>
            <form className="planner-form" onSubmit={handleCalendarSubmit}>
              <div className="type-picker">
                {eventTypes.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={calendarForm.event_type === item.id ? "is-active" : ""}
                    style={{ "--accent": item.accent } as CSSProperties}
                    onClick={() =>
                      setCalendarForm((current) => ({ ...current, event_type: item.id }))
                    }
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <label>
                Title
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  value={calendarForm.title}
                  onChange={(event) =>
                    setCalendarForm((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="Leg day, dinner, buy groceries..."
                />
              </label>
              <label>
                Time
                <input
                  type="time"
                  value={calendarForm.scheduled_time}
                  onChange={(event) =>
                    setCalendarForm((current) => ({
                      ...current,
                      scheduled_time: event.target.value,
                    }))
                  }
                />
              </label>
              <button type="submit" className="primary-button wide">
                Save plan
              </button>
            </form>

            <div className="event-actions">
              {calendarEvents
                .filter((event) => event.scheduled_date === selectedDate)
                .map((event) => (
                  <article key={event.id} className="event-edit-row">
                    <div>
                      <strong>{event.title}</strong>
                      <small>{event.event_type} - {event.status}</small>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateCalendarStatus(
                          event.id,
                          event.status === "done" ? "planned" : "done",
                        )
                      }
                    >
                      {event.status === "done" ? "Undo" : "Done"}
                    </button>
                    <button type="button" onClick={() => deleteCalendarEvent(event.id)}>
                      Delete
                    </button>
                  </article>
                ))}
            </div>
          </aside>
        </section>
        )}

        {activeTab === "search" && (
        <section
          id="search"
          className={selectedFood ? "search-layout has-selection" : "search-layout is-browsing"}
        >
          <section className="panel search-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Add to {activeMealSlot}</span>
                <h2>Find food</h2>
              </div>
            </div>

            <div className="add-methods">
              <button type="button" className="method-card active">
                <strong>Search</strong>
                <span>Products and brands</span>
              </button>
              <button type="button" className="method-card">
                <strong>Barcode</strong>
                <span>Scanner hook next</span>
              </button>
              <button type="button" className="method-card">
                <strong>Photo</strong>
                <span>AI vision slot</span>
              </button>
            </div>

            <form className="search-form" onSubmit={handleSearch}>
              <label htmlFor="food-search">Search product database</label>
              <div>
                <input
                  id="food-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Danone, arroz, pollo, Mercadona..."
                />
                <button type="submit">Search</button>
              </div>
            </form>

            <div className="store-row" aria-label="Store filter">
              <button
                type="button"
                className={!storeFilter ? "is-active" : ""}
                onClick={() => {
                  setStoreFilter("");
                  void loadFoods(query, "");
                  setIsFoodListOpen(true);
                }}
              >
                All
              </button>
              {stores.map((store) => (
                <button
                  key={store}
                  type="button"
                  className={storeFilter === store ? "is-active" : ""}
                  onClick={() => {
                    setStoreFilter(store);
                    void loadFoods(query, store);
                    setIsFoodListOpen(true);
                  }}
                >
                  {store}
                </button>
              ))}
            </div>

            {recentFoods.length > 0 && (
              <div className="recent-strip">
                <span>Recent</span>
                <div>
                  {recentFoods.map((food) => (
                    <button key={food.id} type="button" onClick={() => chooseFood(food)}>
                      {food.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="results-toolbar">
              <div>
                <span className="eyebrow">Results</span>
                <strong>{foods.length} products loaded</strong>
              </div>
              <button type="button" onClick={() => setIsFoodListOpen((current) => !current)}>
                {isFoodListOpen ? "Hide list" : "Show list"}
              </button>
            </div>

            {isFoodListOpen ? (
              <div className="product-list">
                {foods.map((food) => (
                  <ProductRow key={food.id} food={food} onSelect={chooseFood} />
                ))}
                {canLoadMoreFoods && (
                  <button type="button" className="load-more" onClick={loadMoreFoods}>
                    Load more products
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="collapsed-results"
                onClick={() => setIsFoodListOpen(true)}
              >
                Product list hidden. Tap to show {foods.length} loaded products.
              </button>
            )}
          </section>

          {selectedFood && (
            <aside className="panel add-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Confirm serving</span>
                  <h2>Ready to log</h2>
                </div>
                <button
                  type="button"
                  className="close-panel"
                  aria-label="Close selected food"
                  onClick={() => setSelectedFood(null)}
                >
                  ×
                </button>
              </div>
              <div className="serving-card">
                <FoodVisual food={selectedFood} size="lg" />
                <h3>{selectedFood.name}</h3>
                <p>
                  {[selectedFood.brand, selectedFood.store, selectedFood.serving_label]
                    .filter(Boolean)
                    .join(" - ") || selectedFood.detail}
                </p>
                <div className="nutrition-grid">
                  <StatTile label="Calories" value={formatKcal(selectedFood.calories)} detail="base" />
                  <StatTile label="Protein" value={`${selectedFood.protein_g}g`} detail="base" />
                  <StatTile label="Carbs" value={`${selectedFood.carbs_g}g`} detail="base" />
                  <StatTile label="Fat" value={`${selectedFood.fat_g}g`} detail="base" />
                </div>
                <label className="quantity-field">
                  Quantity
                  <input
                    type="number"
                    min="0.1"
                    max="8"
                    step="0.1"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                  />
                </label>
                <div className="slot-picker">
                  {mealSlots.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      className={activeMealSlot === slot.id ? "is-active" : ""}
                      onClick={() => setActiveMealSlot(slot.id)}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
                <button type="button" className="primary-button wide" onClick={saveSelectedFood}>
                  Save to diary
                </button>
                {money(selectedFood) && <small className="price-note">{money(selectedFood)}</small>}
              </div>
            </aside>
          )}
        </section>
        )}

        {activeTab === "insights" && (
        <section id="insights" className="insights-grid">
          <section className="panel estimate-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Smart assistant</span>
                <h2>Describe a meal</h2>
              </div>
            </div>
            <form onSubmit={handleEstimate} className="estimate-form">
              <textarea
                value={estimateText}
                onChange={(event) => setEstimateText(event.target.value)}
                placeholder="Yogur Danone con avena, banana y miel"
              />
              <button type="submit" className="primary-button wide">
                Match nutrition
              </button>
            </form>
            {estimate && (
              <div className="estimate-result">
                <strong>{estimate.label}</strong>
                <span>
                  {formatKcal(estimate.calories)} - {Math.round(estimate.confidence * 100)}%
                  confidence
                </span>
              </div>
            )}
          </section>

          <section className="panel scan-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Scan lab</span>
                <h2>Barcode or photo</h2>
              </div>
            </div>

            <form className="scanner-form" onSubmit={handleBarcodeSearch}>
              <label>
                Barcode
                <div>
                  <input
                    value={barcodeText}
                    onChange={(event) => setBarcodeText(event.target.value)}
                    inputMode="numeric"
                    placeholder="843700..."
                  />
                  <button type="submit">Find</button>
                </div>
              </label>
            </form>

            <form className="photo-form" onSubmit={handlePhotoEstimate}>
              <label className="photo-drop">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setPhotoPreview(file ? URL.createObjectURL(file) : null);
                  }}
                />
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview} alt="" />
                ) : (
                  <span>Tap to add food photo</span>
                )}
              </label>
              <button type="submit" className="secondary-button wide">
                Trial estimate
              </button>
            </form>
          </section>

          <section className="panel streak-panel">
            <span className="eyebrow">Progress</span>
            <h2>Built for daily use</h2>
            <div className="calendar-dots">
              {Array.from({ length: 21 }).map((_, index) => (
                <span key={index} className={index < Math.min(meals.length + 6, 21) ? "filled" : ""} />
              ))}
            </div>
            <p>
              The skeleton now has the core loops: account, searchable food DB, serving
              confirmation, diary save, delete, and persistent Postgres data.
            </p>
          </section>
        </section>
        )}

        {activeTab === "profile" && (
        <section id="profile" className="profile-grid">
          <section className="panel profile-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Account</span>
                <h2>{profile ? profile.name : "Create your profile"}</h2>
              </div>
              {profile && (
                <button type="button" className="secondary-button" onClick={logout}>
                  Log out
                </button>
              )}
            </div>

            {profile && (
              <div className="profile-summary">
                <StatTile label="Email" value={profile.email} detail="saved in DB" />
                <StatTile
                  label="Routine"
                  value={activityLabels[profile.activity_level]}
                  detail="activity"
                />
                <StatTile label="Goal" value={formatKcal(profile.calorie_goal)} detail="daily" />
              </div>
            )}

            <div className="auth-tabs" aria-label="Authentication mode">
              {(["register", "login"] as AuthMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={authMode === mode ? "is-active" : ""}
                  onClick={() => setAuthMode(mode)}
                >
                  {mode === "register" ? "Register" : "Login"}
                </button>
              ))}
            </div>

            <form className="auth-form" onSubmit={handleAuth}>
              {authMode === "register" && (
                <label>
                  Name
                  <input
                    required
                    minLength={2}
                    maxLength={80}
                    value={authForm.name}
                    onChange={(event) =>
                      setAuthForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Nika Stone"
                  />
                </label>
              )}
              <label>
                Email
                <input
                  required
                  type="email"
                  value={authForm.email}
                  onChange={(event) =>
                    setAuthForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="nika@trackfood.ai"
                />
              </label>
              <label>
                Password
                <input
                  required
                  type="password"
                  minLength={8}
                  value={authForm.password}
                  onChange={(event) =>
                    setAuthForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder="8+ characters"
                />
              </label>
              {authMode === "register" && (
                <div className="form-pair">
                  <label>
                    Daily goal
                    <input
                      required
                      type="number"
                      min={1000}
                      max={6000}
                      value={authForm.calorieGoal}
                      onChange={(event) =>
                        setAuthForm((current) => ({
                          ...current,
                          calorieGoal: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Activity
                    <select
                      value={authForm.activityLevel}
                      onChange={(event) =>
                        setAuthForm((current) => ({
                          ...current,
                          activityLevel: event.target.value as ActivityLevel,
                        }))
                      }
                    >
                      <option value="light">Light</option>
                      <option value="balanced">Balanced</option>
                      <option value="active">Active</option>
                    </select>
                  </label>
                </div>
              )}
              <button type="submit" className="primary-button wide">
                {authMode === "register" ? "Create account" : "Login"}
              </button>
            </form>
            <p className="status-text">{status}</p>
          </section>
        </section>
        )}
      </div>

      <BottomNav activeTab={activeTab} onNavigate={navigate} />
    </main>
  );
}
