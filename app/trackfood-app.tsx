"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Theme = "light" | "dark";
type ActivityLevel = "light" | "balanced" | "active";
type AuthMode = "register" | "login";
type TabId = "home" | "diary" | "search" | "calendar" | "assistant" | "insights" | "profile";
type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";
type ServingMode = "grams" | "serving" | "package";
type ScanMode = "search" | "barcode" | "photo";
type ToastTone = "success" | "error" | "info";
type CalendarEventType = "meal" | "training" | "task" | "note";
type CalendarEventStatus = "planned" | "done" | "skipped";
type UserRole = "user" | "admin";

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
  phone_number?: string | null;
  avatar_data_url?: string | null;
  calorie_goal: number;
  activity_level: ActivityLevel;
  role?: UserRole;
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

type AssistantContext = {
  id: string;
  title: string;
  summary: string;
  created_at: string;
  updated_at: string;
};

type AssistantMessage = {
  id: string;
  context_id: string;
  role: "user" | "assistant";
  content: string;
  provider: string;
  model: string;
  created_at: string;
};

type SecurityEvent = {
  id: string;
  action: string;
  severity: "info" | "warning" | "critical";
  ip: string;
  path: string;
  details: string;
  created_at: string;
};

type SecuritySummary = {
  events: number;
  warnings: number;
  critical: number;
  blocked_intruders: number;
  recent_events: SecurityEvent[];
};

type IntruderFlag = {
  id: string;
  ip: string;
  fingerprint: string;
  attempts: number;
  is_blocked: boolean;
  last_seen_at: string;
};

type AuthFormState = {
  name: string;
  email: string;
  password: string;
  calorieGoal: string;
  activityLevel: ActivityLevel;
};

type ProfileFormState = {
  name: string;
  phoneNumber: string;
  calorieGoal: string;
  activityLevel: ActivityLevel;
};

type ToastState = {
  id: number;
  tone: ToastTone;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

type DailyTotals = {
  goal: number;
  eaten: number;
  remaining: number;
  overGoal: number;
  progressPercent: number;
  mealCount: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
};

type AppStatus = {
  products: number;
};

const PRODUCT_PAGE_SIZE = 50;
const SESSION_EXPIRED_MESSAGE = "Session expired. Please login again.";

const tabs: { id: TabId; label: string; short: string }[] = [
  { id: "home", label: "Main", short: "Main" },
  { id: "diary", label: "Diary", short: "Diary" },
  { id: "search", label: "Add food", short: "Add" },
  { id: "calendar", label: "Calendar", short: "Plan" },
  { id: "assistant", label: "Assistant", short: "AI" },
  { id: "insights", label: "Insights", short: "Stats" },
  { id: "profile", label: "Profile", short: "Me" },
];

const mobileTabs: { id: TabId; label: string; short: string }[] = [
  { id: "home", label: "Today", short: "Today" },
  { id: "search", label: "Add", short: "Add" },
  { id: "diary", label: "Diary", short: "Diary" },
  { id: "assistant", label: "AI", short: "AI" },
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
  return `${new Intl.NumberFormat("en-US").format(Math.round(value))} kcal`;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: value >= 10_000 ? 1 : 0,
  }).format(value);
}

function formatMacro(value: number) {
  return `${Math.round(value)}g`;
}

function buildDailyTotals(meals: MealLog[], rawGoal: number): DailyTotals {
  const goal = clamp(Math.round(rawGoal) || 1850, 1000, 6000);
  const macros = meals.reduce(
    (acc, meal) => ({
      protein: acc.protein + meal.protein_g,
      carbs: acc.carbs + meal.carbs_g,
      fat: acc.fat + meal.fat_g,
      fiber: acc.fiber + meal.fiber_g,
    }),
    { protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
  const eaten = meals.reduce((sum, meal) => sum + meal.calories, 0);
  const delta = goal - eaten;

  return {
    goal,
    eaten,
    remaining: Math.max(delta, 0),
    overGoal: Math.max(-delta, 0),
    progressPercent: clamp(Math.round((eaten / goal) * 100), 0, 140),
    mealCount: meals.length,
    macros,
  };
}

function dailyKcalLine(dailyTotals: DailyTotals, includeToday = true) {
  const suffix = includeToday ? " today" : "";
  if (dailyTotals.overGoal > 0) {
    return `Over by ${formatKcal(dailyTotals.overGoal)}${suffix}`;
  }
  return `${formatKcal(dailyTotals.remaining)} left${suffix}`;
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateKeyFromIso(value: string) {
  return dateKey(new Date(value));
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

function foodTitle(food: FoodItem) {
  let name = food.name.split(/\s+-\s+/)[0] ?? food.name;
  for (const prefix of [food.brand, food.store]) {
    const cleanedPrefix = prefix?.trim();
    if (cleanedPrefix && name.toLowerCase().startsWith(cleanedPrefix.toLowerCase())) {
      name = name.slice(cleanedPrefix.length).replace(/^[-:·\s]+/, "");
    }
  }
  name = name
    .replace(/^(?:alcampo\s+)?cultivamos\s+lo\s+bueno\s+/i, "")
    .replace(/\s+¡?haz\s+tu\s+compra\s+online.*$/i, "")
    .replace(/\s+clase\s+[a-z]\b.*$/i, "")
    .replace(/\s+cat\.?\s+[a-z]\b.*$/i, "")
    .replace(/\s+\d+(?:[,.]\d+)?\s*(?:uds?|unidades|packs?|x|kg|g|gr|ml|cl|l)\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return name || food.name;
}

function foodDedupeKey(food: FoodItem) {
  return [
    foodTitle(food).toLowerCase(),
    (food.store || "").toLowerCase(),
    (food.brand || "").toLowerCase(),
    food.calories,
    food.protein_g,
    food.carbs_g,
    food.fat_g,
  ].join("|");
}

function dedupeFoods(items: FoodItem[]) {
  const seen = new Set<string>();
  return items.filter((food) => {
    const key = foodDedupeKey(food);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function scaledFood(food: FoodItem, multiplier: number) {
  return {
    calories: Math.round(food.calories * multiplier),
    protein_g: Math.round(food.protein_g * multiplier),
    carbs_g: Math.round(food.carbs_g * multiplier),
    fat_g: Math.round(food.fat_g * multiplier),
    fiber_g: Math.round(food.fiber_g * multiplier),
  };
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

class ApiError extends Error {
  status: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "ApiError";
    this.status = statusCode;
  }
}

function getErrorStatus(error: unknown) {
  return error instanceof ApiError ? error.status : null;
}

function isAuthExpiredError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return (
    getErrorStatus(error) === 401 ||
    message.includes("invalid bearer token") ||
    message.includes("missing bearer token") ||
    message.includes("unauthorized") ||
    message.includes("401")
  );
}

function safeInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!domain) {
    return email;
  }
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${"*".repeat(Math.max(name.length - visible.length, 3))}@${domain}`;
}

function profileFirstName(profile: PublicProfile | null) {
  return profile?.name.trim().split(/\s+/)[0] || "You";
}

function resizeAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read avatar file"));
    reader.onload = () => {
      const image = new window.Image();
      image.onerror = () => reject(new Error("Could not load avatar image"));
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 320;
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Could not prepare avatar"));
          return;
        }

        const scale = Math.max(size / image.width, size / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
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
    throw new ApiError(detail, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function getApiBase() {
  const configured = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
  const isLocalHost = (hostname: string) =>
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".local") ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);

  if (configured) {
    try {
      const configuredUrl = new URL(configured);
      if (!isLocalHost(configuredUrl.hostname)) {
        return configured;
      }
    } catch {
      if (!configured.includes("localhost") && !configured.includes("127.0.0.1")) {
        return configured;
      }
    }
  }

  if (typeof window === "undefined") {
    return configured ?? "http://127.0.0.1:8000";
  }

  const { protocol, hostname } = window.location;
  if (!isLocalHost(hostname)) {
    return window.location.origin;
  }

  return configured ?? `${protocol}//${hostname || "127.0.0.1"}:8000`;
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

function clearClientAuthStorage() {
  if (typeof window === "undefined") {
    return;
  }

  [
    "trackfood-token",
    "trackfood-profile",
    "trackfood-saved-foods",
  ].forEach((key) => window.localStorage.removeItem(key));

  for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = window.sessionStorage.key(index);
    if (key?.startsWith("trackfood-")) {
      window.sessionStorage.removeItem(key);
    }
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister())),
      )
      .catch(() => {
        // Cache cleanup is best-effort after logout.
      });
  }

  if ("caches" in window) {
    window.caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => window.caches.delete(key))))
      .catch(() => {
        // Cache cleanup is best-effort after logout.
      });
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

function BrandMark({ size = "sm" }: { size?: "sm" | "md" }) {
  return <span className={`brand-mark ${size}`}>TF</span>;
}

function AvatarBubble({
  profile,
  size = "md",
}: {
  profile: PublicProfile | null;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span className={`avatar-bubble ${size}`}>
      {profile?.avatar_data_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatar_data_url} alt="" />
      ) : (
        <span>{safeInitials(profile?.name || "TrackFood") || "TF"}</span>
      )}
    </span>
  );
}

function AccountChip({
  profile,
  calories,
  goal,
  onClick,
}: {
  profile: PublicProfile | null;
  calories: number;
  goal: number;
  onClick: () => void;
}) {
  return (
    <button type="button" className="account-chip" onClick={onClick}>
      <AvatarBubble profile={profile} size="sm" />
      <span>
        <strong>{profileFirstName(profile)}</strong>
        <small>
          {formatKcal(calories)} / {formatKcal(goal)}
        </small>
      </span>
      <i style={{ width: `${clamp(Math.round((calories / goal) * 100), 0, 100)}%` }} />
    </button>
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
  onEdit,
  onDelete,
}: {
  slot: (typeof mealSlots)[number];
  meals: MealLog[];
  onAdd: (slot: MealSlot) => void;
  onEdit: (meal: MealLog) => void;
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
              <button type="button" className="meal-row-main" onClick={() => onEdit(meal)}>
                <strong title={meal.food.name}>{foodTitle(meal.food)}</strong>
                <small>
                  {meal.food.brand || meal.food.store || meal.food.serving_label || "Food"} -
                  {" "}{formatKcal(meal.calories)}
                </small>
              </button>
              <div className="meal-row-actions">
                <button type="button" onClick={() => onEdit(meal)}>
                  Edit
                </button>
                <button type="button" onClick={() => onDelete(meal.id)}>
                  Remove
                </button>
              </div>
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
        <strong title={food.name}>{foodTitle(food)}</strong>
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
  const selectedMeals = meals.filter((meal) => dateKeyFromIso(meal.logged_at) === selectedDate);

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
          const dayMeals = meals.filter((meal) => dateKeyFromIso(meal.logged_at) === key);
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
              <strong title={meal.food.name}>{foodTitle(meal.food)}</strong>
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
  onAuthModeChange,
  onAuthFormChange,
  onSubmit,
}: {
  theme: Theme;
  status: string;
  authMode: AuthMode;
  authForm: AuthFormState;
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
          <span className="dark-only-pill">Private beta</span>
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
      {mobileTabs.map((tab) => (
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
  const barcodeVideoRef = useRef<HTMLVideoElement | null>(null);
  const barcodeStreamRef = useRef<MediaStream | null>(null);
  const [theme, setTheme] = useState<Theme>("dark");
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [isRailOpen, setIsRailOpen] = useState(true);
  const [foods, setFoods] = useState<FoodItem[]>(fallbackFoods);
  const [indexedProducts, setIndexedProducts] = useState(0);
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
  const [isFoodLoading, setIsFoodLoading] = useState(false);
  const [foodSearchError, setFoodSearchError] = useState("");
  const [lastFoodQuery, setLastFoodQuery] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [servingMode, setServingMode] = useState<ServingMode>("grams");
  const [grams, setGrams] = useState("100");
  const [packageMultiplier, setPackageMultiplier] = useState("1");
  const [editingMeal, setEditingMeal] = useState<MealLog | null>(null);
  const [editGrams, setEditGrams] = useState("100");
  const [editMealSlot, setEditMealSlot] = useState<MealSlot>("breakfast");
  const [editLoggedAt, setEditLoggedAt] = useState("");
  const [savedFoodIds, setSavedFoodIds] = useState<string[]>([]);
  const [scanMode, setScanMode] = useState<ScanMode>("search");
  const [barcodeScanError, setBarcodeScanError] = useState("");
  const [isBarcodeScanning, setIsBarcodeScanning] = useState(false);
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
  const [assistantContexts, setAssistantContexts] = useState<AssistantContext[]>([]);
  const [activeAssistantContextId, setActiveAssistantContextId] = useState<string | null>(null);
  const [contextTitle, setContextTitle] = useState("New context");
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([]);
  const [assistantText, setAssistantText] = useState("");
  const [isAssistantLoading, setIsAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState("");
  const [currentDateKey, setCurrentDateKey] = useState(() => dateKey(new Date()));
  const [securitySummary, setSecuritySummary] = useState<SecuritySummary | null>(null);
  const [intruders, setIntruders] = useState<IntruderFlag[]>([]);
  const [scrollDepth, setScrollDepth] = useState(0);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isSavingMeal, setIsSavingMeal] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingCalendar, setIsSavingCalendar] = useState(false);
  const [isSavingContext, setIsSavingContext] = useState(false);
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    calorieGoal: "1850",
    activityLevel: "balanced" as ActivityLevel,
  });
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    name: "",
    phoneNumber: "",
    calorieGoal: "1850",
    activityLevel: "balanced",
  });
  const assistantAbortRef = useRef<AbortController | null>(null);

  const parsedGoal = Number(profileForm.calorieGoal || authForm.calorieGoal) || 1850;
  const todaysMeals = useMemo(
    () => meals.filter((meal) => dateKeyFromIso(meal.logged_at) === currentDateKey),
    [currentDateKey, meals],
  );
  const dailyTotals = useMemo(
    () => buildDailyTotals(todaysMeals, profile?.calorie_goal ?? parsedGoal),
    [parsedGoal, profile?.calorie_goal, todaysMeals],
  );
  const goal = dailyTotals.goal;
  const totals = {
    calories: dailyTotals.eaten,
    protein: dailyTotals.macros.protein,
    carbs: dailyTotals.macros.carbs,
    fat: dailyTotals.macros.fat,
    fiber: dailyTotals.macros.fiber,
  };
  const progress = dailyTotals.progressPercent;
  const remaining = dailyTotals.remaining;
  const productIndexLabel = indexedProducts
    ? `${formatCount(indexedProducts)} products indexed`
    : "Product database ready";
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
  const mostEatenFoods = useMemo(() => {
    const counts = new Map<string, { food: FoodItem; count: number }>();
    for (const meal of meals) {
      const current = counts.get(meal.food.id);
      counts.set(meal.food.id, {
        food: meal.food,
        count: (current?.count ?? 0) + 1,
      });
    }
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [meals]);
  const savedFoods = useMemo(() => {
    const sources = [...foods, ...meals.map((meal) => meal.food)];
    const byId = new Map(sources.map((food) => [food.id, food]));
    return savedFoodIds.map((id) => byId.get(id)).filter(Boolean).slice(0, 8) as FoodItem[];
  }, [foods, meals, savedFoodIds]);
  const servingMultiplier = useMemo(() => {
    if (servingMode === "grams") {
      return clamp((Number(grams) || 100) / 100, 0.05, 20);
    }
    if (servingMode === "package") {
      return clamp(Number(packageMultiplier) || 1, 0.05, 20);
    }
    return clamp(Number(quantity) || 1, 0.05, 20);
  }, [grams, packageMultiplier, quantity, servingMode]);
  const selectedNutrition = useMemo(
    () => (selectedFood ? scaledFood(selectedFood, servingMultiplier) : null),
    [selectedFood, servingMultiplier],
  );

  const selectedDayEvents = useMemo(
    () => calendarEvents.filter((event) => event.scheduled_date === selectedDate),
    [calendarEvents, selectedDate],
  );
  const weekActivity = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }).map((_, index) => {
      const day = addDays(today, index - 6);
      const key = dateKey(day);
      const dayMeals = meals.filter((meal) => dateKeyFromIso(meal.logged_at) === key);
      return {
        key,
        label: shortWeekday(day).slice(0, 2),
        calories: dayMeals.reduce((sum, meal) => sum + meal.calories, 0),
      };
    });
  }, [meals]);

  useEffect(() => {
    let timer: number | undefined;
    const syncLocalDay = () => {
      const now = new Date();
      const nextKey = dateKey(now);
      setCurrentDateKey(nextKey);
      setSelectedDate((current) => (current === currentDateKey ? nextKey : current));

      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 2, 0);
      timer = window.setTimeout(syncLocalDay, Math.max(nextMidnight.getTime() - now.getTime(), 1000));
    };

    syncLocalDay();
    return () => {
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [currentDateKey]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const savedToken = window.localStorage.getItem("trackfood-token");
      const savedProfile = readStoredProfile();
      const savedFoodRaw = window.localStorage.getItem("trackfood-saved-foods");

      setTheme("dark");
      window.localStorage.setItem("trackfood-theme", "dark");
      setToken(savedToken);
      if (savedFoodRaw) {
        try {
          setSavedFoodIds(JSON.parse(savedFoodRaw) as string[]);
        } catch {
          setSavedFoodIds([]);
        }
      }

      if (savedProfile) {
        setAuthForm((current) => ({
          ...current,
          name: savedProfile.name,
          email: savedProfile.email,
          calorieGoal: String(savedProfile.calorie_goal),
          activityLevel: savedProfile.activity_level,
        }));
        setProfileForm({
          name: savedProfile.name,
          phoneNumber: savedProfile.phone_number || "",
          calorieGoal: String(savedProfile.calorie_goal),
          activityLevel: savedProfile.activity_level,
        });
      }

      void apiRequest<AppStatus>("/api/v1/status")
        .then((appStatus) => {
          setIndexedProducts(appStatus.products);
        })
        .catch(() => {
          setIndexedProducts(0);
        });

      void apiRequest<FoodItem[]>(`/api/v1/foods?limit=${PRODUCT_PAGE_SIZE}`)
        .then((items) => {
          setFoods(items.length ? dedupeFoods(items) : fallbackFoods);
          setFoodOffset(items.length);
          setCanLoadMoreFoods(items.length === PRODUCT_PAGE_SIZE);
          setStatus("Product database ready");
        })
        .catch((error) => {
          setFoods(fallbackFoods);
          setStatus(getErrorMessage(error));
        });

      if (savedToken) {
        void apiRequest<PublicProfile>("/api/v1/profile", {}, savedToken)
          .then((remoteProfile) => {
            setProfile(remoteProfile);
            setProfileForm({
              name: remoteProfile.name,
              phoneNumber: remoteProfile.phone_number || "",
              calorieGoal: String(remoteProfile.calorie_goal),
              activityLevel: remoteProfile.activity_level,
            });
            window.localStorage.setItem("trackfood-profile", JSON.stringify(remoteProfile));
            void refreshSecurity(savedToken, remoteProfile);
          })
          .catch((error) => {
            if (isAuthExpiredError(error)) {
              handleSessionExpired();
              return;
            }
            setStatus(getErrorMessage(error));
          });
        void apiRequest<MealLog[]>("/api/v1/meals", {}, savedToken)
          .then((remoteMeals) => {
            setMeals(remoteMeals);
            setStatus("Synced");
          })
          .catch((error) => {
            if (isAuthExpiredError(error)) {
              handleSessionExpired();
              return;
            }
            setStatus(getErrorMessage(error));
          });
        const calendarAnchor = new Date();
        const start = dateKey(new Date(calendarAnchor.getFullYear(), calendarAnchor.getMonth(), 1));
        const end = dateKey(new Date(calendarAnchor.getFullYear(), calendarAnchor.getMonth() + 2, 0));
        void apiRequest<CalendarEvent[]>(
          `/api/v1/calendar/events?date_from=${start}&date_to=${end}`,
          {},
          savedToken,
        )
          .then(setCalendarEvents)
          .catch((error) => {
            if (isAuthExpiredError(error)) {
              handleSessionExpired();
              return;
            }
            setStatus(getErrorMessage(error));
          });
        void refreshAssistant(savedToken);
      } else {
        setStatus("Create account to sync");
      }
      setIsHydrated(true);
    });

    return () => window.cancelAnimationFrame(frame);
    // Initial hydration should run once; refresh helpers are called with captured saved token/profile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.localStorage.setItem("trackfood-theme", theme);
  }, [theme]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => {
          // Cache cleanup is best-effort during beta development.
        });
    }
    if ("caches" in window) {
      window.caches
        .keys()
        .then((keys) => Promise.all(keys.map((key) => window.caches.delete(key))))
        .catch(() => {
          // Cache cleanup is best-effort during beta development.
        });
    }
  }, []);

  useEffect(() => {
    if (isHydrated) {
      window.localStorage.setItem("trackfood-saved-foods", JSON.stringify(savedFoodIds));
    }
  }, [isHydrated, savedFoodIds]);

  useEffect(() => {
    if (!isHydrated || activeTab !== "search") {
      return;
    }

    const normalizedQuery = query.trim();
    const timer = window.setTimeout(() => {
      if (normalizedQuery.length >= 2 || storeFilter) {
        void loadFoods(normalizedQuery, storeFilter, 0, { silent: true });
      }
    }, 360);

    return () => window.clearTimeout(timer);
    // loadFoods intentionally stays outside deps; this is a controlled debounce around query/store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isHydrated, query, storeFilter]);

  useEffect(() => {
    if (!isHydrated || !token) {
      return;
    }
    const timer = window.setTimeout(() => {
      void loadFoods(query, storeFilter, 0, { silent: true });
    }, 360);
    return () => window.clearTimeout(timer);
    // loadFoods intentionally reads stable state through params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, query, storeFilter, token]);

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

  async function loadFoods(
    nextQuery = query,
    nextStore = storeFilter,
    nextOffset = 0,
    options: { silent?: boolean } = {},
  ) {
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
      setIsFoodLoading(true);
      setFoodSearchError("");
      setLastFoodQuery(nextQuery.trim());
      const items = await apiRequest<FoodItem[]>(`/api/v1/foods?${params.toString()}`);
      const nextItems = dedupeFoods(items);
      const shouldUseFallback = !nextOffset && !nextQuery.trim() && !nextStore.trim() && !items.length;
      setFoods((current) =>
        nextOffset > 0 ? dedupeFoods([...current, ...nextItems]) : shouldUseFallback ? fallbackFoods : nextItems,
      );
      setFoodOffset(nextOffset + items.length);
      setCanLoadMoreFoods(items.length === PRODUCT_PAGE_SIZE);
      if (!options.silent) {
        setStatus(items.length ? `${nextOffset + items.length} products shown` : "No products found");
      }
    } catch (error) {
      setFoods(fallbackFoods);
      setFoodSearchError(getErrorMessage(error));
      setStatus(getErrorMessage(error));
    } finally {
      setIsFoodLoading(false);
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
      if (isAuthExpiredError(error)) {
        handleSessionExpired();
        return;
      }
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
      if (isAuthExpiredError(error)) {
        handleSessionExpired();
        return;
      }
      setStatus(getErrorMessage(error));
    }
  }

  async function refreshAssistantContexts(nextToken = token, preferredContextId = activeAssistantContextId) {
    if (!nextToken) {
      setAssistantContexts([]);
      setActiveAssistantContextId(null);
      return null;
    }

    const contexts = await apiRequest<AssistantContext[]>(
      "/api/v1/assistant/contexts",
      {},
      nextToken,
    );
    setAssistantContexts(contexts);
    const selected = contexts.find((context) => context.id === preferredContextId) ?? contexts[0] ?? null;
    setActiveAssistantContextId(selected?.id ?? null);
    setContextTitle(selected?.title ?? "New context");
    return selected?.id ?? null;
  }

  async function refreshAssistant(nextToken = token, nextContextId = activeAssistantContextId) {
    if (!nextToken) {
      setAssistantMessages([]);
      return;
    }
    try {
      const contextId = nextContextId ?? (await refreshAssistantContexts(nextToken, nextContextId));
      const suffix = contextId ? `?context_id=${encodeURIComponent(contextId)}` : "";
      const messages = await apiRequest<AssistantMessage[]>(
        `/api/v1/assistant/messages${suffix}`,
        {},
        nextToken,
      );
      setAssistantMessages(messages);
      setAssistantError("");
    } catch (error) {
      if (isAuthExpiredError(error)) {
        handleSessionExpired();
        return;
      }
      setAssistantError(getErrorMessage(error));
    }
  }

  async function refreshSecurity(nextToken = token, nextProfile = profile) {
    if (!nextToken || nextProfile?.role !== "admin") {
      setSecuritySummary(null);
      setIntruders([]);
      return;
    }
    try {
      const [summary, flagged] = await Promise.all([
        apiRequest<SecuritySummary>("/api/v1/security/summary", {}, nextToken),
        apiRequest<IntruderFlag[]>("/api/v1/security/intruders", {}, nextToken),
      ]);
      setSecuritySummary(summary);
      setIntruders(flagged);
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

  function showToast(
    message: string,
    tone: ToastTone = "info",
    action?: { label: string; run: () => void },
  ) {
    const id = Date.now();
    setToast({
      id,
      tone,
      message,
      actionLabel: action?.label,
      onAction: action?.run,
    });
    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 4200);
  }

  function resetSession(message: string, tone: ToastTone = "info") {
    setToken(null);
    setProfile(null);
    setMeals([]);
    setCalendarEvents([]);
    setAssistantContexts([]);
    setActiveAssistantContextId(null);
    setContextTitle("New context");
    setAssistantMessages([]);
    setSecuritySummary(null);
    setIntruders([]);
    setSavedFoodIds([]);
    setSelectedFood(null);
    setEditingMeal(null);
    setEstimate(null);
    setPhotoPreview(null);
    setBarcodeText("");
    setActiveTab("home");
    setAuthMode("login");
    setAuthForm((current) => ({
      ...current,
      name: "",
      email: "",
      password: "",
    }));
    clearClientAuthStorage();
    setStatus(message);
    showToast(message, tone);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/");
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }

  function handleSessionExpired() {
    resetSession(SESSION_EXPIRED_MESSAGE, "error");
  }

  function handleSaveError(error: unknown, fallback = "Save failed") {
    const message = getErrorMessage(error) || fallback;
    if (isAuthExpiredError(error)) {
      handleSessionExpired();
      return;
    }
    setStatus(message);
    showToast(message, "error");
  }

  function openAdd(slot: MealSlot) {
    setActiveMealSlot(slot);
    setIsFoodListOpen(false);
    navigate("search");
  }

  function chooseFood(food: FoodItem) {
    setSelectedFood(food);
    setIsFoodListOpen(false);
    setScanMode("search");
  }

  async function saveSelectedFood() {
    if (!selectedFood || isSavingMeal) {
      return;
    }
    if (!token) {
      setStatus("Register or login to save meals in the database");
      showToast("Login to save meals", "error");
      navigate("profile");
      return;
    }

    try {
      setIsSavingMeal(true);
      const meal = await apiRequest<MealLog>(
        "/api/v1/meals",
        {
          method: "POST",
          body: JSON.stringify({
            food_id: selectedFood.id,
            meal_slot: activeMealSlot,
            serving_multiplier: servingMultiplier,
          }),
        },
        token,
      );
      setMeals((current) => [meal, ...current]);
      setSelectedFood(null);
      setQuantity("1");
      setGrams("100");
      setPackageMultiplier("1");
      setStatus("Added to diary");
      showToast("Saved to diary", "success", {
        label: "Undo",
        run: () => void deleteMeal(meal.id, { silent: true }),
      });
      navigate("diary");
    } catch (error) {
      handleSaveError(error, "Could not save meal");
    } finally {
      setIsSavingMeal(false);
    }
  }

  function toggleSavedFood(food: FoodItem) {
    setSavedFoodIds((current) => {
      const isSaved = current.includes(food.id);
      showToast(isSaved ? "Removed from saved meals" : "Saved meal shortcut", "success");
      return isSaved ? current.filter((id) => id !== food.id) : [food.id, ...current].slice(0, 24);
    });
  }

  async function quickRelog(food: FoodItem, slot = activeMealSlot, multiplier = 1) {
    if (!token) {
      navigate("profile");
      setStatus("Login to relog meals");
      showToast("Login to relog meals", "error");
      return;
    }
    try {
      setIsSavingMeal(true);
      const meal = await apiRequest<MealLog>(
        "/api/v1/meals",
        {
          method: "POST",
          body: JSON.stringify({
            food_id: food.id,
            meal_slot: slot,
            serving_multiplier: multiplier,
          }),
        },
        token,
      );
      setMeals((current) => [meal, ...current]);
      setStatus(`${foodTitle(food)} relogged`);
      showToast("Relogged", "success", {
          label: "Undo",
          run: () => void deleteMeal(meal.id, { silent: true }),
      });
    } catch (error) {
      handleSaveError(error, "Could not relog meal");
    } finally {
      setIsSavingMeal(false);
    }
  }

  function openMealEditor(meal: MealLog) {
    setEditingMeal(meal);
    setEditMealSlot(meal.meal_slot);
    setEditGrams(String(Math.max(Math.round(meal.serving_multiplier * 100), 1)));
    setEditLoggedAt(toDateTimeLocal(meal.logged_at));
  }

  async function saveEditedMeal() {
    if (!token || !editingMeal || isSavingMeal) {
      return;
    }
    try {
      setIsSavingMeal(true);
      const updated = await apiRequest<MealLog>(
        `/api/v1/meals/${editingMeal.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            meal_slot: editMealSlot,
            serving_multiplier: clamp((Number(editGrams) || 100) / 100, 0.05, 20),
            logged_at: fromDateTimeLocal(editLoggedAt),
          }),
        },
        token,
      );
      setMeals((current) =>
        current.map((meal) => (meal.id === updated.id ? updated : meal)),
      );
      setEditingMeal(null);
      setStatus("Meal updated");
      showToast("Meal updated", "success");
    } catch (error) {
      handleSaveError(error, "Could not update meal");
    } finally {
      setIsSavingMeal(false);
    }
  }

  async function duplicateMeal(mealId = editingMeal?.id) {
    if (!token || !mealId || isSavingMeal) {
      return;
    }
    try {
      setIsSavingMeal(true);
      const duplicated = await apiRequest<MealLog>(
        `/api/v1/meals/${mealId}/duplicate`,
        { method: "POST" },
        token,
      );
      setMeals((current) => [duplicated, ...current]);
      setEditingMeal(null);
      setStatus("Meal duplicated");
      showToast("Meal duplicated", "success", {
        label: "Undo",
        run: () => void deleteMeal(duplicated.id, { silent: true }),
      });
    } catch (error) {
      handleSaveError(error, "Could not duplicate meal");
    } finally {
      setIsSavingMeal(false);
    }
  }

  async function deleteMeal(mealId: string, options: { silent?: boolean } = {}) {
    if (!token) {
      return;
    }
    const removedMeal = meals.find((meal) => meal.id === mealId) ?? null;

    try {
      await apiRequest<{ status: string }>(
        `/api/v1/meals/${mealId}`,
        { method: "DELETE" },
        token,
      );
      setMeals((current) => current.filter((meal) => meal.id !== mealId));
      if (editingMeal?.id === mealId) {
        setEditingMeal(null);
      }
      setStatus("Meal removed");
      if (!options.silent) {
        showToast("Meal removed", "success", removedMeal ? {
          label: "Undo",
          run: () => {
            void quickRelog(removedMeal.food, removedMeal.meal_slot, removedMeal.serving_multiplier);
          },
        } : undefined);
      }
    } catch (error) {
      handleSaveError(error, "Could not remove meal");
    }
  }

  function stopBarcodeScanner() {
    barcodeStreamRef.current?.getTracks().forEach((track) => track.stop());
    barcodeStreamRef.current = null;
    setIsBarcodeScanning(false);
  }

  async function startBarcodeScanner() {
    setBarcodeScanError("");
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setBarcodeScanError("Camera is not available in this browser.");
      setStatus("Use manual barcode input");
      return;
    }
    const BarcodeDetectorCtor = (
      window as unknown as {
        BarcodeDetector?: new (options?: { formats?: string[] }) => {
          detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
        };
      }
    ).BarcodeDetector;
    if (!BarcodeDetectorCtor) {
      setBarcodeScanError("Barcode camera scan is not supported here. Enter the barcode manually.");
      setStatus("Manual barcode input ready");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      barcodeStreamRef.current = stream;
      setIsBarcodeScanning(true);
      setStatus("Camera scanner active");
      const video = barcodeVideoRef.current;
      if (!video) {
        stopBarcodeScanner();
        return;
      }
      video.srcObject = stream;
      await video.play();
      const detector = new BarcodeDetectorCtor({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
      });
      const scan = async () => {
        if (!barcodeStreamRef.current || !barcodeVideoRef.current) {
          return;
        }
        const results = await detector.detect(barcodeVideoRef.current);
        const code = results[0]?.rawValue;
        if (code) {
          stopBarcodeScanner();
          setBarcodeText(code);
          setQuery(code);
          await loadFoods(code, "", 0);
          setIsFoodListOpen(true);
          return;
        }
        window.requestAnimationFrame(() => void scan());
      };
      await scan();
    } catch (error) {
      stopBarcodeScanner();
      setBarcodeScanError(getErrorMessage(error));
      setStatus("Camera denied. Use manual barcode input.");
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
      setProfileForm({
        name: payload.profile.name,
        phoneNumber: payload.profile.phone_number || "",
        calorieGoal: String(payload.profile.calorie_goal),
        activityLevel: payload.profile.activity_level,
      });
      setAuthForm((current) => ({ ...current, password: "" }));
      window.localStorage.setItem("trackfood-token", payload.token);
      window.localStorage.setItem("trackfood-profile", JSON.stringify(payload.profile));
      setStatus(authMode === "register" ? "Account created" : "Logged in");
      await refreshMeals(payload.token);
      await refreshCalendar(payload.token);
      await refreshAssistant(payload.token);
      await refreshSecurity(payload.token, payload.profile);
      navigate("home");
    } catch (error) {
      setStatus(getErrorMessage(error));
    }
  }

  function logout() {
    resetSession("Logged out. Login or register to continue.", "success");
  }

  function exportAccountData() {
    const payload = {
      profile,
      meals,
      calendarEvents,
      assistantContexts,
      exported_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "trackfood-ai-account-export.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || isSavingProfile) {
      return;
    }

    try {
      setIsSavingProfile(true);
      const updated = await apiRequest<PublicProfile>(
        "/api/v1/profile",
        {
          method: "PATCH",
          body: JSON.stringify({
            name: profileForm.name.trim(),
            phone_number: profileForm.phoneNumber.trim() || null,
            calorie_goal: clamp(Number(profileForm.calorieGoal) || 1850, 1000, 6000),
            activity_level: profileForm.activityLevel,
          }),
        },
        token,
      );
      setProfile(updated);
      setProfileForm({
        name: updated.name,
        phoneNumber: updated.phone_number || "",
        calorieGoal: String(updated.calorie_goal),
        activityLevel: updated.activity_level,
      });
      window.localStorage.setItem("trackfood-profile", JSON.stringify(updated));
      setStatus("Profile saved");
      showToast("Profile saved", "success");
    } catch (error) {
      handleSaveError(error, "Could not save profile");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function saveAvatar(file: File | undefined) {
    if (!file || !token) {
      return;
    }

    try {
      setIsSavingProfile(true);
      const avatar_data_url = await resizeAvatar(file);
      const updated = await apiRequest<PublicProfile>(
        "/api/v1/profile",
        {
          method: "PATCH",
          body: JSON.stringify({ avatar_data_url }),
        },
        token,
      );
      setProfile(updated);
      window.localStorage.setItem("trackfood-profile", JSON.stringify(updated));
      setStatus("Avatar updated");
      showToast("Avatar saved", "success");
    } catch (error) {
      handleSaveError(error, "Could not save avatar");
    } finally {
      setIsSavingProfile(false);
    }
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
      showToast("Login to save calendar plans", "error");
      navigate("profile");
      return;
    }
    const eventType = eventTypes.find((item) => item.id === calendarForm.event_type) ?? eventTypes[2];

    try {
      setIsSavingCalendar(true);
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
      showToast("Plan saved", "success", {
        label: "Undo",
        run: () => void deleteCalendarEvent(created.id, { silent: true }),
      });
    } catch (error) {
      handleSaveError(error, "Could not save plan");
    } finally {
      setIsSavingCalendar(false);
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
      showToast("Plan updated", "success");
    } catch (error) {
      handleSaveError(error, "Could not update plan");
    }
  }

  async function deleteCalendarEvent(eventId: string, options: { silent?: boolean } = {}) {
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
      if (!options.silent) {
        showToast("Plan removed", "success");
      }
    } catch (error) {
      handleSaveError(error, "Could not remove plan");
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
    if (!photoPreview) {
      setStatus("Add photo first");
      showToast("Add photo first", "error");
      return;
    }
    const description = estimateText.trim() || "photo food estimate";
    setEstimateText(description);
    try {
      const payload = await apiRequest<NutritionEstimate>("/api/v1/nutrition/estimate", {
        method: "POST",
        body: JSON.stringify({ description }),
      });
      setEstimate(payload);
      const matches = await apiRequest<FoodItem[]>(
        `/api/v1/foods?q=${encodeURIComponent(payload.label)}&limit=8`,
      );
      if (matches[0]) {
        chooseFood(matches[0]);
      }
      setStatus("Photo estimate ready");
    } catch (error) {
      setStatus(getErrorMessage(error));
    }
  }

  async function handleAssistantSubmit(event?: FormEvent<HTMLFormElement>, forcedMessage?: string) {
    event?.preventDefault();
    const message = (forcedMessage ?? assistantText).trim();
    if (!message || !token || isAssistantLoading) {
      return;
    }

    const localUserMessage: AssistantMessage = {
      id: `local-${Date.now()}`,
      context_id: activeAssistantContextId ?? "local",
      role: "user",
      content: message,
      provider: "local",
      model: "pending",
      created_at: new Date().toISOString(),
    };

    setAssistantMessages((current) => [...current, localUserMessage]);
    setAssistantText("");
    setAssistantError("");
    setIsAssistantLoading(true);
    const controller = new AbortController();
    assistantAbortRef.current = controller;
    try {
      const reply = await apiRequest<AssistantMessage>(
        "/api/v1/assistant/messages",
        {
          method: "POST",
          body: JSON.stringify({ message, context_id: activeAssistantContextId }),
          signal: controller.signal,
        },
        token,
      );
      setAssistantMessages((current) => [...current, reply]);
      setActiveAssistantContextId(reply.context_id);
      await refreshAssistantContexts(token, reply.context_id);
      await refreshCalendar(token);
      await refreshMeals(token);
      setStatus("Assistant replied");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setAssistantText(message);
        setStatus("Message stopped. Edit and send again.");
        setAssistantMessages((current) =>
          current.filter((item) => item.id !== localUserMessage.id),
        );
        return;
      }
      setAssistantError(getErrorMessage(error));
      setAssistantMessages((current) =>
        current.filter((item) => item.id !== localUserMessage.id),
      );
    } finally {
      setIsAssistantLoading(false);
      if (assistantAbortRef.current === controller) {
        assistantAbortRef.current = null;
      }
    }
  }

  function stopAssistantGeneration() {
    assistantAbortRef.current?.abort();
  }

  function editAssistantMessage(message: AssistantMessage) {
    if (isAssistantLoading) {
      stopAssistantGeneration();
    }
    setAssistantText(message.content);
    setAssistantError("");
  }

  async function createAssistantContext() {
    if (!token) {
      return;
    }
    try {
      setIsSavingContext(true);
      const context = await apiRequest<AssistantContext>(
        "/api/v1/assistant/contexts",
        {
          method: "POST",
          body: JSON.stringify({ title: "New context" }),
        },
        token,
      );
      setAssistantContexts((current) => [context, ...current]);
      setActiveAssistantContextId(context.id);
      setContextTitle(context.title);
      setAssistantMessages([]);
      setAssistantError("");
      showToast("Context created", "success");
    } catch (error) {
      setAssistantError(getErrorMessage(error));
      handleSaveError(error, "Could not create context");
    } finally {
      setIsSavingContext(false);
    }
  }

  async function selectAssistantContext(contextId: string) {
    setActiveAssistantContextId(contextId);
    const context = assistantContexts.find((item) => item.id === contextId);
    setContextTitle(context?.title ?? "New context");
    await refreshAssistant(token, contextId);
  }

  async function saveAssistantContextTitle() {
    if (!token || !activeAssistantContextId || isSavingContext) {
      return;
    }
    try {
      setIsSavingContext(true);
      const context = await apiRequest<AssistantContext>(
        `/api/v1/assistant/contexts/${activeAssistantContextId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ title: contextTitle.trim() || "New context" }),
        },
        token,
      );
      setAssistantContexts((current) =>
        current.map((item) => (item.id === context.id ? context : item)),
      );
      setContextTitle(context.title);
      showToast("Context saved", "success");
    } catch (error) {
      setAssistantError(getErrorMessage(error));
      handleSaveError(error, "Could not save context");
    } finally {
      setIsSavingContext(false);
    }
  }

  async function deleteAssistantContext() {
    if (!token || !activeAssistantContextId || assistantContexts.length <= 1 || isSavingContext) {
      return;
    }
    try {
      setIsSavingContext(true);
      await apiRequest(
        `/api/v1/assistant/contexts/${activeAssistantContextId}`,
        { method: "DELETE" },
        token,
      );
      const nextContexts = assistantContexts.filter((context) => context.id !== activeAssistantContextId);
      const nextContext = nextContexts[0] ?? null;
      setAssistantContexts(nextContexts);
      setActiveAssistantContextId(nextContext?.id ?? null);
      setContextTitle(nextContext?.title ?? "New context");
      await refreshAssistant(token, nextContext?.id ?? null);
      showToast("Context deleted", "success");
    } catch (error) {
      setAssistantError(getErrorMessage(error));
      handleSaveError(error, "Could not delete context");
    } finally {
      setIsSavingContext(false);
    }
  }

  async function unblockIntruder(intruderId: string) {
    if (!token || profile?.role !== "admin") {
      return;
    }
    try {
      await apiRequest<IntruderFlag>(
        `/api/v1/security/intruders/${intruderId}/unblock`,
        { method: "POST" },
        token,
      );
      await refreshSecurity(token, profile);
      setStatus("Intruder unblocked");
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
          <a
            className="brand"
            href="#home"
            onClick={(event) => {
              event.preventDefault();
              navigate("home");
            }}
          >
            <BrandMark size="sm" />
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
        <button type="button" className="rail-account" onClick={() => navigate("profile")}>
          <AvatarBubble profile={profile} size="sm" />
          <span>
            <strong>{profileFirstName(profile)}</strong>
            <small>{formatKcal(totals.calories)} today</small>
          </span>
        </button>
      </aside>

      <div className="app-content">
        {(activeTab === "home" || activeTab === "diary") && (
          <button type="button" className="mobile-fab" onClick={() => openAdd("breakfast")}>
            + Add food
          </button>
        )}
        <header className="topbar">
          <a
            className="mobile-brand"
            href="#home"
            onClick={(event) => {
              event.preventDefault();
              navigate("home");
            }}
          >
            <BrandMark size="sm" />
            <strong>{tabs.find((tab) => tab.id === activeTab)?.label ?? "TrackFood AI"}</strong>
          </a>
          <div className="topbar-actions">
            <AccountChip
              profile={profile}
              calories={totals.calories}
              goal={goal}
              onClick={() => navigate("profile")}
            />
          </div>
        </header>

        {activeTab === "home" && (
          <section id="home" className="home-grid app-page">
            <div className="hero-card hero-main">
              <div className="hero-copy">
                <span className="eyebrow">Main menu</span>
                <h1>{formatKcal(totals.calories)}</h1>
                <p>{dailyKcalLine(dailyTotals)}</p>
                <button type="button" className="big-add-button" onClick={() => openAdd("breakfast")}>
                  + Add food
                </button>
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
                  detail={`${dailyTotals.mealCount} meals today`}
                  onClick={() => navigate("diary")}
                />
                <HomeAction
                  label="Food DB"
                  title="Add product"
                  detail={productIndexLabel}
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
                  detail={photoPreview ? "Photo ready" : "Scan food"}
                  onClick={() => navigate("insights")}
                />
              </div>
            </section>

            <section className="panel summary-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Macro dashboard</span>
                  <h2>{dailyTotals.mealCount} meals logged</h2>
                </div>
              </div>
              <div className="stats-grid">
                <StatTile label="Protein" value={`${totals.protein}g`} detail="tracked" />
                <StatTile label="Carbs" value={`${totals.carbs}g`} detail="tracked" />
                <StatTile label="Fiber" value={`${totals.fiber}g`} detail="tracked" />
              </div>
              <div className="macro-stack">
                <MacroLine label="Protein" value={totals.protein} goal={140} color="#2bb673" />
                <MacroLine label="Carbs" value={totals.carbs} goal={240} color="#4f86f7" />
                <MacroLine label="Fat" value={totals.fat} goal={70} color="#ff795e" />
              </div>
              {todaysMeals.length > 0 && (
                <div className="latest-meals">
                  <span className="eyebrow">Latest meals</span>
                  {todaysMeals.slice(0, 3).map((meal) => (
                    <button key={meal.id} type="button" onClick={() => openMealEditor(meal)}>
                      <strong>{foodTitle(meal.food)}</strong>
                      <small>
                        {new Date(meal.logged_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {meal.meal_slot} · {formatKcal(meal.calories)}
                      </small>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </section>
        )}

        {activeTab === "diary" && (
        <section id="diary" className="diary-grid">
          <div className="hero-card">
            <div className="hero-copy">
              <span className="eyebrow">Today</span>
              <h1>{formatKcal(totals.calories)}</h1>
              <p>{dailyKcalLine(dailyTotals, false)}</p>
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
                  meals={todaysMeals.filter((meal) => meal.meal_slot === slot.id)}
                  onAdd={openAdd}
                  onEdit={openMealEditor}
                  onDelete={deleteMeal}
                />
              ))}
            </div>
          </section>

          <section className="panel summary-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Macro dashboard</span>
                <h2>{formatKcal(goal)} daily goal</h2>
              </div>
            </div>
            <div className="stats-grid">
              <StatTile label="Balance" value={dailyTotals.overGoal ? `+${formatKcal(dailyTotals.overGoal)}` : formatKcal(remaining)} detail={dailyTotals.overGoal ? "over goal" : "left"} />
              <StatTile label="Meals" value={String(dailyTotals.mealCount)} detail="logged" />
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
              <button type="submit" className="primary-button wide" disabled={isSavingCalendar}>
                {isSavingCalendar ? "Saving..." : "Save plan"}
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
              <button
                type="button"
                className={scanMode === "search" ? "method-card active" : "method-card"}
                onClick={() => setScanMode("search")}
              >
                <strong>Search</strong>
                <span>Products and brands</span>
              </button>
              <button
                type="button"
                className={scanMode === "barcode" ? "method-card active" : "method-card"}
                onClick={() => setScanMode("barcode")}
              >
                <strong>Barcode</strong>
                <span>Camera or manual code</span>
              </button>
              <button
                type="button"
                className={scanMode === "photo" ? "method-card active" : "method-card"}
                onClick={() => setScanMode("photo")}
              >
                <strong>Photo</strong>
                <span>Upload or camera</span>
              </button>
            </div>

            {scanMode === "barcode" && (
              <section className="inline-scan-panel">
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
                <div className="barcode-camera">
                  <video ref={barcodeVideoRef} muted playsInline />
                  <span className="scan-frame" aria-hidden="true" />
                  <div>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void startBarcodeScanner()}
                      disabled={isBarcodeScanning}
                    >
                      {isBarcodeScanning ? "Scanning..." : "Scan with camera"}
                    </button>
                    {isBarcodeScanning && (
                      <button type="button" className="secondary-button" onClick={stopBarcodeScanner}>
                        Stop
                      </button>
                    )}
                  </div>
                  <small>
                    {barcodeScanError ||
                      (isBarcodeScanning ? "Point the frame at the barcode." : "Camera scan or manual code.")}
                  </small>
                </div>
              </section>
            )}

            {scanMode === "photo" && (
              <section className="inline-scan-panel">
                <form className="photo-form" onSubmit={handlePhotoEstimate}>
                  <label className="photo-drop">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
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
                  {photoPreview && (
                    <button
                      type="button"
                      className="secondary-button wide"
                      onClick={() => {
                        setPhotoPreview(null);
                        setEstimate(null);
                      }}
                    >
                      Retake photo
                    </button>
                  )}
              <button type="submit" className="primary-button wide" disabled={!photoPreview}>
                {photoPreview ? "Estimate food" : "Add photo first"}
                  </button>
                </form>
                {estimate && (
                  <div className="estimate-result compact-result">
                    <strong>{estimate.label}</strong>
                    <span>
                      {formatKcal(estimate.calories)} · {Math.round(estimate.confidence * 100)}% confidence
                    </span>
                    {selectedFood && (
                      <button type="button" className="secondary-button" onClick={saveSelectedFood}>
                        Add matched food
                      </button>
                    )}
                  </div>
                )}
              </section>
            )}

            <form className="search-form" onSubmit={handleSearch}>
              <label htmlFor="food-search">Search product database</label>
              <div>
                <input
                  id="food-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Danone, arroz, pollo, Mercadona..."
                />
                {query && (
                  <button
                    type="button"
                    className="clear-search"
                    aria-label="Clear search"
                    onClick={() => {
                      setQuery("");
                      void loadFoods("", storeFilter, 0, { silent: true });
                    }}
                  >
                    ×
                  </button>
                )}
                <button type="submit" disabled={isFoodLoading}>
                  {isFoodLoading ? "Searching..." : "Search"}
                </button>
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

            {(recentFoods.length > 0 || mostEatenFoods.length > 0 || savedFoods.length > 0) && (
              <div className="quick-food-panel">
                {recentFoods.length > 0 && (
                  <div className="recent-strip">
                    <span>Recently eaten</span>
                    <div>
                      {recentFoods.map((food) => (
                        <button key={food.id} type="button" onClick={() => void quickRelog(food)}>
                          {foodTitle(food)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {mostEatenFoods.length > 0 && (
                  <div className="recent-strip">
                    <span>Most eaten</span>
                    <div>
                      {mostEatenFoods.map(({ food, count }) => (
                        <button key={food.id} type="button" onClick={() => void quickRelog(food)}>
                          {foodTitle(food)} · {count}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {savedFoods.length > 0 && (
                  <div className="recent-strip">
                    <span>Saved meals</span>
                    <div>
                      {savedFoods.map((food) => (
                        <button key={food.id} type="button" onClick={() => chooseFood(food)}>
                          {foodTitle(food)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="results-toolbar">
              <div>
                <span className="eyebrow">Results</span>
                <strong>
                  {isFoodLoading
                    ? "Loading products..."
                    : `${foods.length} shown${canLoadMoreFoods ? "+" : ""}`}
                </strong>
                <small>
                  {lastFoodQuery
                    ? `Search: ${lastFoodQuery} · ${productIndexLabel}`
                    : productIndexLabel}
                </small>
              </div>
              <button type="button" onClick={() => setIsFoodListOpen((current) => !current)}>
                {isFoodListOpen ? "Hide list" : "Show list"}
              </button>
            </div>

            {isFoodListOpen ? (
              <div className="product-list">
                {foodSearchError && <div className="empty-state compact">{foodSearchError}</div>}
                {isFoodLoading && !foods.length && (
                  <div className="product-skeletons" aria-label="Loading products">
                    <span />
                    <span />
                    <span />
                  </div>
                )}
                {!foodSearchError && !foods.length && !isFoodLoading && (
                  <div className="empty-state compact">No products found. Try another name or barcode.</div>
                )}
                {foods.map((food) => (
                  <ProductRow key={food.id} food={food} onSelect={chooseFood} />
                ))}
                {canLoadMoreFoods && (
                  <button type="button" className="load-more" onClick={loadMoreFoods}>
                    {isFoodLoading ? "Loading..." : "Load more products"}
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="collapsed-results"
                onClick={() => setIsFoodListOpen(true)}
              >
                Product list hidden. Tap to show {foods.length}{canLoadMoreFoods ? "+" : ""} shown products.
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
                <h3 title={selectedFood.name}>{foodTitle(selectedFood)}</h3>
                <p>
                  {[selectedFood.brand, selectedFood.store, selectedFood.serving_label]
                    .filter(Boolean)
                    .join(" - ") || selectedFood.detail}
                </p>
                <div className="nutrition-grid">
                  <StatTile
                    label="Calories"
                    value={formatKcal(selectedNutrition?.calories ?? selectedFood.calories)}
                    detail="live"
                  />
                  <StatTile
                    label="Protein"
                    value={formatMacro(selectedNutrition?.protein_g ?? selectedFood.protein_g)}
                    detail="live"
                  />
                  <StatTile
                    label="Carbs"
                    value={formatMacro(selectedNutrition?.carbs_g ?? selectedFood.carbs_g)}
                    detail="live"
                  />
                  <StatTile
                    label="Fat"
                    value={formatMacro(selectedNutrition?.fat_g ?? selectedFood.fat_g)}
                    detail="live"
                  />
                </div>
                <div className="serving-mode" aria-label="Serving mode">
                  {(["grams", "serving", "package"] as ServingMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={servingMode === mode ? "is-active" : ""}
                      onClick={() => setServingMode(mode)}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <small className="serving-note">
                  Base: {selectedFood.serving_label || "per 100g"} · values recalculate before save.
                </small>
                {servingMode === "grams" && (
                  <div className="portion-tools">
                    <label className="quantity-field">
                      Grams
                      <input
                        type="number"
                        min="1"
                        max="2000"
                        step="1"
                        value={grams}
                        onChange={(event) => setGrams(event.target.value)}
                      />
                    </label>
                    <div className="quick-grams">
                      {[50, 100, 150, 200].map((value) => (
                        <button key={value} type="button" onClick={() => setGrams(String(value))}>
                          {value}g
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {servingMode === "serving" && (
                  <label className="quantity-field">
                    Servings
                    <input
                      type="number"
                      min="0.1"
                      max="20"
                      step="0.1"
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                    />
                    <small>{selectedFood.serving_label || "1 serving"}</small>
                  </label>
                )}
                {servingMode === "package" && (
                  <label className="quantity-field">
                    Packages
                    <input
                      type="number"
                      min="0.05"
                      max="20"
                      step="0.05"
                      value={packageMultiplier}
                      onChange={(event) => setPackageMultiplier(event.target.value)}
                    />
                    <small>Use when the base product is one pack.</small>
                  </label>
                )}
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
                <div className="selected-actions">
                  <button type="button" className="secondary-button" onClick={() => toggleSavedFood(selectedFood)}>
                    {savedFoodIds.includes(selectedFood.id) ? "Saved" : "Save meal"}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void quickRelog(selectedFood)}
                    disabled={isSavingMeal}
                  >
                    {isSavingMeal ? "Saving..." : "One-tap relog"}
                  </button>
                </div>
                <div className="sticky-save-bar">
                  <button
                    type="button"
                    className="primary-button wide"
                    onClick={saveSelectedFood}
                    disabled={isSavingMeal}
                  >
                    {isSavingMeal ? "Saving..." : "Save to diary"}
                  </button>
                </div>
                {money(selectedFood) && <small className="price-note">{money(selectedFood)}</small>}
              </div>
            </aside>
          )}
        </section>
        )}

        {activeTab === "assistant" && (
        <section id="assistant" className="assistant-grid app-page">
          <section className="panel assistant-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">TrackFood AI</span>
                <h2>Assistant</h2>
              </div>
              <button type="button" className="secondary-button" onClick={() => void refreshAssistant()}>
                Sync
              </button>
            </div>

            <div className="assistant-thread" aria-live="polite">
              {assistantMessages.length === 0 && !assistantError && (
                <div className="assistant-empty">
                  <strong>Start with a real request.</strong>
                  <span>Ask it to log food, plan a reminder, or check today&apos;s balance. The assistant uses your account context through the backend.</span>
                </div>
              )}
              {assistantMessages.map((message) => (
                <article key={message.id} className={`chat-bubble ${message.role}`}>
                  <div className="chat-avatar" aria-hidden="true">
                    {message.role === "assistant" ? "TF" : "You"}
                  </div>
                  <div className="chat-message">
                    <div className="chat-meta">
                      <span>{message.role === "assistant" ? "TrackFood AI" : "You"}</span>
                      {message.role === "user" && (
                        <button type="button" className="chat-edit-button" onClick={() => editAssistantMessage(message)}>
                          Edit
                        </button>
                      )}
                    </div>
                    <p>{message.content}</p>
                  </div>
                </article>
              ))}
              {isAssistantLoading && (
                <article className="chat-bubble assistant is-loading">
                  <div className="chat-avatar" aria-hidden="true">TF</div>
                  <div className="chat-message">
                    <div className="chat-meta">
                      <span>TrackFood AI</span>
                    </div>
                    <p>Thinking through your food log...</p>
                  </div>
                </article>
              )}
              {assistantError && (
                <div className="assistant-error">
                  <strong>{assistantError}</strong>
                  <span>
                    {assistantError === "AI key is not configured"
                      ? "GEMINI_API_KEY is missing in the backend environment."
                      : "Backend is configured. Try Sync again or send a new message."}
                  </span>
                </div>
              )}
            </div>

            <form className="assistant-form" onSubmit={(event) => void handleAssistantSubmit(event)}>
              <textarea
                value={assistantText}
                onChange={(event) => setAssistantText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleAssistantSubmit();
                  }
                }}
                placeholder="Ask to add food, plan a reminder, or check your day..."
              />
              {isAssistantLoading ? (
                <button type="button" className="secondary-button stop-button" onClick={stopAssistantGeneration}>
                  Stop
                </button>
              ) : (
                <button type="submit" className="primary-button" disabled={!assistantText.trim()}>
                  Send
                </button>
              )}
            </form>
          </section>

          <aside className="panel assistant-side">
            <div className="panel-heading compact-heading">
              <div>
                <span className="eyebrow">Contexts</span>
                <h2>Memory</h2>
              </div>
              <button type="button" className="secondary-button" onClick={() => void createAssistantContext()}>
                New
              </button>
            </div>

            <div className="context-list">
              {assistantContexts.map((context) => (
                <button
                  key={context.id}
                  type="button"
                  className={context.id === activeAssistantContextId ? "active" : ""}
                  onClick={() => void selectAssistantContext(context.id)}
                >
                  <strong>{context.title}</strong>
                  <span>{new Date(context.updated_at).toLocaleDateString()}</span>
                </button>
              ))}
            </div>

            <label className="context-editor">
              <span>Context name</span>
              <input
                value={contextTitle}
                onChange={(event) => setContextTitle(event.target.value)}
                maxLength={80}
              />
            </label>
            <div className="context-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => void saveAssistantContextTitle()}
                disabled={isSavingContext}
              >
                {isSavingContext ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                className="secondary-button danger-soft"
                onClick={() => void deleteAssistantContext()}
                disabled={assistantContexts.length <= 1 || isSavingContext}
              >
                Delete
              </button>
            </div>

            <div className="assistant-memory-card">
              <span>Today</span>
              <strong>{formatKcal(totals.calories)}</strong>
              <small>{dailyTotals.mealCount} meals, {selectedDayEvents.length} plans</small>
            </div>
            <p>
              Contexts are saved to your account, so each chat can keep its own memory for meal planning, grocery choices, or training days.
            </p>
          </aside>
        </section>
        )}

        {activeTab === "insights" && (
        <section id="insights" className="insights-grid">
          <section className="panel insights-hero">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Stats</span>
                <h2>Today&apos;s signal</h2>
              </div>
              <strong>{dailyTotals.progressPercent}%</strong>
            </div>
            <div className="insight-rings">
              <div
                className="calorie-orbit"
                style={{
                  background: `conic-gradient(var(--accent) ${Math.min(
                    progress,
                    100,
                  )}%, var(--line-soft) 0)`,
                }}
              >
                <span>{formatKcal(totals.calories)}</span>
              </div>
              <div className="macro-stack">
                <MacroLine label="Protein" value={totals.protein} goal={140} color="#2bb673" />
                <MacroLine label="Carbs" value={totals.carbs} goal={240} color="#4f86f7" />
                <MacroLine label="Fat" value={totals.fat} goal={70} color="#ff795e" />
                <MacroLine label="Fiber" value={totals.fiber} goal={30} color="#2FE28B" />
              </div>
            </div>
            <div className="stats-grid">
              <StatTile label="7-day avg" value={formatKcal(Math.round(weekActivity.reduce((sum, day) => sum + day.calories, 0) / 7))} detail="calories" />
              <StatTile label="Consistency" value={`${weekActivity.filter((day) => day.calories > 0).length}/7`} detail="days logged" />
              <StatTile label="Balance" value={dailyKcalLine(dailyTotals, false)} detail="today" />
            </div>
            <div className="week-bars" aria-label="Weekly calories">
              {weekActivity.map((day) => (
                <span key={day.key}>
                  <i style={{ height: `${clamp((day.calories / Math.max(goal, 1)) * 100, 6, 100)}%` }} />
                  <small>{day.label}</small>
                </span>
              ))}
            </div>
          </section>

          <section className="panel estimate-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Nutrition match</span>
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
                {photoPreview ? "Estimate food" : "Add photo first"}
              </button>
            </form>
          </section>

          <section className="panel scanner-summary">
            <span className="eyebrow">Scanner status</span>
            <h2>{photoPreview ? "Photo ready" : barcodeText ? "Barcode ready" : "Ready to scan"}</h2>
            <p>
              Use barcode search for exact products, or upload a photo before estimate. No photo means no estimate.
            </p>
            <div className="stats-grid">
              <StatTile label="Products" value={formatCount(indexedProducts || foods.length)} detail={indexedProducts ? "indexed" : "shown"} />
              <StatTile label="Estimate" value={estimate ? estimate.label : "None"} detail="latest" />
              <StatTile label="Source" value="DB" detail="local" />
            </div>
          </section>
        </section>
        )}

        {activeTab === "profile" && (
        <section id="profile" className="profile-grid">
          <section className="panel profile-panel">
            <div className="profile-hero">
              <label className="avatar-editor">
                <AvatarBubble profile={profile} size="lg" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => void saveAvatar(event.target.files?.[0])}
                />
                <span>Change avatar</span>
              </label>
              <div className="profile-title">
                <span className="eyebrow">Member profile</span>
                <h2>{profile?.name}</h2>
                <p>{maskEmail(profile?.email || "")}</p>
              </div>
              <button type="button" className="secondary-button" onClick={logout}>
                Log out
              </button>
            </div>

            <div className="profile-summary">
              <StatTile
                label="Today"
                value={formatKcal(totals.calories)}
                detail={dailyKcalLine(dailyTotals, false)}
              />
              <StatTile label="Meals" value={String(dailyTotals.mealCount)} detail="logged today" />
              <StatTile label="Plans" value={String(selectedDayEvents.length)} detail={selectedDate} />
              <StatTile
                label="Routine"
                value={activityLabels[profile?.activity_level || "balanced"]}
                detail="activity"
              />
            </div>

            <div className="secure-card">
              <div>
                <span className="eyebrow">Private account</span>
                <strong>{profile?.phone_number ? "Phone linked" : "Phone not linked"}</strong>
                <small>{profile?.phone_number || "Add a phone number for a more complete profile."}</small>
              </div>
              <div>
                <span className="eyebrow">Email</span>
                <strong>{maskEmail(profile?.email || "")}</strong>
                <small>Hidden on profile cards</small>
              </div>
            </div>

            <div className="data-controls">
              <div>
                <span className="eyebrow">Privacy</span>
                <strong>Account data</strong>
                <small>Export your profile, diary, plans, and assistant contexts.</small>
              </div>
              <button type="button" className="secondary-button" onClick={exportAccountData}>
                Export JSON
              </button>
              <button type="button" className="secondary-button danger-soft" onClick={logout}>
                Sign out device
              </button>
            </div>

            <div className="data-controls compact-controls">
              <div>
                <span className="eyebrow">Units</span>
                <strong>Metric</strong>
                <small>grams / kg · language selector hidden until full localization.</small>
              </div>
              <label>
                Units
                <select defaultValue="metric">
                  <option value="metric">Metric · grams / kg</option>
                  <option value="imperial">Imperial · oz / lb</option>
                </select>
              </label>
            </div>

            {profile?.role === "admin" && (
              <section className="security-admin">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">Security admin</span>
                    <h2>Backend shield</h2>
                  </div>
                  <button type="button" className="secondary-button" onClick={() => void refreshSecurity()}>
                    Refresh
                  </button>
                </div>
                <div className="profile-summary">
                  <StatTile label="Events" value={String(securitySummary?.events ?? 0)} detail="tracked" />
                  <StatTile label="Warnings" value={String(securitySummary?.warnings ?? 0)} detail="recent" />
                  <StatTile label="Critical" value={String(securitySummary?.critical ?? 0)} detail="blocked" />
                  <StatTile label="Intruders" value={String(securitySummary?.blocked_intruders ?? 0)} detail="blocked" />
                </div>
                <div className="security-list">
                  {(securitySummary?.recent_events ?? []).slice(0, 5).map((event) => (
                    <article key={event.id}>
                      <span className={`severity-dot ${event.severity}`} />
                      <div>
                        <strong>{event.action}</strong>
                        <small>{event.ip} - {event.path}</small>
                      </div>
                    </article>
                  ))}
                  {intruders.filter((intruder) => intruder.is_blocked).slice(0, 4).map((intruder) => (
                    <article key={intruder.id}>
                      <span className="severity-dot critical" />
                      <div>
                        <strong>{intruder.ip}</strong>
                        <small>{intruder.attempts} attempts - {intruder.fingerprint}</small>
                      </div>
                      <button type="button" onClick={() => void unblockIntruder(intruder.id)}>
                        Unblock
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <form className="profile-edit-form" onSubmit={saveProfile}>
              <label>
                Display name
                <input
                  required
                  minLength={2}
                  maxLength={80}
                  value={profileForm.name}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </label>
              <label>
                Phone
                <input
                  value={profileForm.phoneNumber}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      phoneNumber: event.target.value,
                    }))
                  }
                  inputMode="tel"
                  placeholder="+34 600 000 000"
                />
              </label>
              <div className="form-pair">
                <label>
                  Daily goal
                  <input
                    required
                    type="number"
                    min={1000}
                    max={6000}
                    value={profileForm.calorieGoal}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        calorieGoal: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Activity
                  <select
                    value={profileForm.activityLevel}
                    onChange={(event) =>
                      setProfileForm((current) => ({
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
              <button type="submit" className="primary-button wide" disabled={isSavingProfile}>
                {isSavingProfile ? "Saving..." : "Save profile"}
              </button>
            </form>
            <p className="status-text">{status}</p>
          </section>
        </section>
        )}

        {editingMeal && (
          <div className="modal-backdrop" role="dialog" aria-modal="true">
            <section className="panel meal-editor">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Edit diary food</span>
                  <h2 title={editingMeal.food.name}>{foodTitle(editingMeal.food)}</h2>
                </div>
                <button
                  type="button"
                  className="close-panel"
                  aria-label="Close editor"
                  onClick={() => setEditingMeal(null)}
                >
                  ×
                </button>
              </div>
              <div className="nutrition-grid">
                <StatTile
                  label="Calories"
                  value={formatKcal(scaledFood(editingMeal.food, clamp((Number(editGrams) || 100) / 100, 0.05, 20)).calories)}
                  detail="edited"
                />
                <StatTile label="Current" value={`${editGrams}g`} detail="portion" />
              </div>
              <div className="portion-tools">
                <label className="quantity-field">
                  Grams
                  <input
                    type="number"
                    min="1"
                    max="2000"
                    value={editGrams}
                    onChange={(event) => setEditGrams(event.target.value)}
                  />
                </label>
                <div className="quick-grams">
                  {[50, 100, 150, 200].map((value) => (
                    <button key={value} type="button" onClick={() => setEditGrams(String(value))}>
                      {value}g
                    </button>
                  ))}
                </div>
              </div>
              <div className="slot-picker">
                {mealSlots.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    className={editMealSlot === slot.id ? "is-active" : ""}
                    onClick={() => setEditMealSlot(slot.id)}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
              <label className="quantity-field">
                Time
                <input
                  type="datetime-local"
                  value={editLoggedAt}
                  onChange={(event) => setEditLoggedAt(event.target.value)}
                />
              </label>
              <div className="selected-actions">
                <button type="button" className="secondary-button" onClick={() => toggleSavedFood(editingMeal.food)}>
                  {savedFoodIds.includes(editingMeal.food.id) ? "Saved meal" : "Save as meal"}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void duplicateMeal()}
                  disabled={isSavingMeal}
                >
                  Duplicate
                </button>
                <button type="button" className="danger-soft secondary-button" onClick={() => void deleteMeal(editingMeal.id)}>
                  Delete
                </button>
              </div>
              <button
                type="button"
                className="primary-button wide"
                onClick={() => void saveEditedMeal()}
                disabled={isSavingMeal}
              >
                {isSavingMeal ? "Saving..." : "Save changes"}
              </button>
            </section>
          </div>
        )}
      </div>

      {toast && (
        <div className={`toast toast-${toast.tone}`} role="status" aria-live="polite">
          <span>{toast.message}</span>
          {toast.actionLabel && toast.onAction && (
            <button
              type="button"
              onClick={() => {
                toast.onAction?.();
                setToast(null);
              }}
            >
              {toast.actionLabel}
            </button>
          )}
          <button type="button" aria-label="Dismiss" onClick={() => setToast(null)}>
            ×
          </button>
        </div>
      )}

      <BottomNav activeTab={activeTab} onNavigate={navigate} />
    </main>
  );
}
