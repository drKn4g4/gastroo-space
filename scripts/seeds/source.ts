import type { SeedConfig, SeedRestaurantData, SeedMenuCategory, SeedTable, SeedSection, SeedBooking, SeedShift, TableShape, TableStatus } from './types';

export type UnifiedSeedProfile = 'core' | 'demo' | 'integration' | 'all';

export interface ConsumerLoyaltySeed {
  orgId: string;
  restaurantId: string;
  points: number;
  totalEarned: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  lastActivityDayOffset?: number;
}

export interface ConsumerFavoriteMenuItemSeed {
  orgId: string;
  restaurantId: string;
  itemName: string;
}
export interface AuthSeedUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  isGastronaut: boolean;
  organization: string[];
  displayName: string;
}

export interface ConsumerSeedUser {
  email: string;
  password: string;
  displayName: string;
  favoriteRestaurantIds: string[];
  favoriteMenuItems: ConsumerFavoriteMenuItemSeed[];
  loyaltyPoints: ConsumerLoyaltySeed[];
}


export interface SeedEventDefinition {
  id: string;
  orgId: string;
  restaurantId: string;
  name: string;
  description?: string;
  type: 'event' | 'promotion';
  status: 'draft' | 'active' | 'scheduled' | 'expired' | 'archived';
  priority: number;
  tags?: string[];
  visibility?: 'public' | 'staff';
  schedule: {
    startDayOffset?: number;
    endDayOffset?: number;
    daysOfWeek?: number[];
    timeRanges?: Array<{ from: string; to: string }>;
  };
}

export interface SeedPromotionDefinition {
  id: string;
  orgId: string;
  restaurantId: string;
  name: string;
  description?: string;
  type: string;
  status: SeedEventDefinition['status'];
  priority: number;
  stackable?: boolean;
  menuItemNames?: string[];
  categoryNames?: string[];
  tags?: string[];
  schedule: SeedEventDefinition['schedule'];
  discountPercentage?: number;
  discountAmount?: { amount: number; currency: string };
  fixedPrice?: { amount: number; currency: string };
}

export interface UnifiedSeedSource {
  version: string;
  projectId: string;
  snapshotDir: string;
  masterConfig: SeedConfig;
  extraRestaurants: SeedRestaurantData[];
  authUsers: AuthSeedUser[];
  unassignedUsers: ConsumerSeedUser[];
  additionalOrganizations: Array<{
    organization: SeedConfig['organization'];
    restaurantData: SeedRestaurantData;
    ownerEmails: string[];
    memberEmails?: string[];
  }>;
  promotions: SeedPromotionDefinition[];
  events: SeedEventDefinition[];
  profiles: Record<UnifiedSeedProfile, { seedAuth: boolean; seedFirestore: boolean; seedIntegration: boolean }>;
}

const coreUsers: SeedConfig['users'] = [
  { email: 'owner2@gastroo.dev', password: 'Owner123!', displayName: 'Aleksandra Wlascicielka', role: 'owner', pin: '1112' },
  { email: 'partner@gastroo.dev', password: 'Partner123!', displayName: 'Mikolaj Partner', role: 'owner', pin: '1113' },
  { email: 'admin2@gastroo.dev', password: 'Admin123!', displayName: 'Dominik Administrator', role: 'admin', pin: '2223' },
  { email: 'manager2@gastroo.dev', password: 'Manager123!', displayName: 'Oliwia Manager', role: 'manager', pin: '2233' },
  { email: 'waiter3@gastroo.dev', password: 'Kelner123!', displayName: 'Kamil Kelner', role: 'waiter', pin: '3335' },
  { email: 'chef3@gastroo.dev', password: 'Chef123!', displayName: 'Robert Szef Kuchni', role: 'chef', pin: '4447' },
  { email: 'kelner2@gastroo.dev', password: 'Kelner123!', displayName: 'Nina Kelnerowa', role: 'waiter', pin: '3334' },
  { email: 'sommelier@gastroo.dev', password: 'Sommel123!', displayName: 'Sylwia Sommelier', role: 'sommelier', pin: '5656' },
  { email: 'kucharz2@gastroo.dev', password: 'Kucharz123!', displayName: 'Magdalena Kucharza', role: 'chef', pin: '4445' },
  { email: 'pomoc@gastroo.dev', password: 'Pomoc123!', displayName: 'Piotr Pomoc Kuchni', role: 'kitchen', pin: '4446' },
  { email: 'delivery@gastroo.dev', password: 'Delivery123!', displayName: 'Dariusz Dostawca', role: 'delivery', pin: '7777' },
  { email: 'owner3@gastroo.dev', password: 'Owner123!', displayName: 'Ewa Wlascicielka', role: 'owner', pin: '1114' },
  { email: 'admin3@gastroo.dev', password: 'Admin123!', displayName: 'Hubert Administrator', role: 'admin', pin: '2224' },
  { email: 'manager3@gastroo.dev', password: 'Manager123!', displayName: 'Emilia Manager', role: 'manager', pin: '2234' },
  { email: 'supervisor2@gastroo.dev', password: 'Supervisor123!', displayName: 'Patryk Supervisor', role: 'supervisor', pin: '2235' },
  { email: 'waiter4@gastroo.dev', password: 'Kelner123!', displayName: 'Wiktoria Kelner', role: 'waiter', pin: '3336' },
  { email: 'chef4@gastroo.dev', password: 'Chef123!', displayName: 'Mateusz Chef', role: 'chef', pin: '4448' },
  { email: 'bartender2@gastroo.dev', password: 'Bar123456!', displayName: 'Szymon Barman', role: 'bartender', pin: '5556' },
  { email: 'cashier2@gastroo.dev', password: 'Cashier123!', displayName: 'Monika Kasjerka', role: 'cashier', pin: '6668' },
  { email: 'delivery2@gastroo.dev', password: 'Delivery123!', displayName: 'Adrian Dostawca', role: 'delivery', pin: '7778' },
  { email: 'staff2@gastroo.dev', password: 'Staff123!', displayName: 'Laura Support', role: 'staff', pin: '8882' },
  // ── Wave 2: more cities ──
  { email: 'owner4@gastroo.dev', password: 'Owner123!', displayName: 'Zbigniew Wlasciciel', role: 'owner', pin: '1115' },
  { email: 'owner5@gastroo.dev', password: 'Owner123!', displayName: 'Helena Wlascicielka', role: 'owner', pin: '1116' },
  { email: 'owner6@gastroo.dev', password: 'Owner123!', displayName: 'Roman Przedsiebiorca', role: 'owner', pin: '1117' },
  { email: 'owner7@gastroo.dev', password: 'Owner123!', displayName: 'Dorota Gastronom', role: 'owner', pin: '1118' },
  { email: 'admin4@gastroo.dev', password: 'Admin123!', displayName: 'Filip Administrator', role: 'admin', pin: '2225' },
  { email: 'admin5@gastroo.dev', password: 'Admin123!', displayName: 'Agata Adminowska', role: 'admin', pin: '2226' },
  { email: 'manager4@gastroo.dev', password: 'Manager123!', displayName: 'Jakub Zmianowicz', role: 'manager', pin: '2236' },
  { email: 'manager5@gastroo.dev', password: 'Manager123!', displayName: 'Martyna Salowa', role: 'manager', pin: '2237' },
  { email: 'manager6@gastroo.dev', password: 'Manager123!', displayName: 'Damian Organizator', role: 'manager', pin: '2238' },
  { email: 'waiter5@gastroo.dev', password: 'Kelner123!', displayName: 'Zofia Kelnerka', role: 'waiter', pin: '3337' },
  { email: 'waiter6@gastroo.dev', password: 'Kelner123!', displayName: 'Konrad Obslugowicz', role: 'waiter', pin: '3338' },
  { email: 'waiter7@gastroo.dev', password: 'Kelner123!', displayName: 'Alicja Serwisowa', role: 'waiter', pin: '3339' },
  { email: 'chef5@gastroo.dev', password: 'Chef123!', displayName: 'Lukasz Pizzaiolo', role: 'chef', pin: '4449' },
  { email: 'chef6@gastroo.dev', password: 'Chef123!', displayName: 'Natalia Sous-Chef', role: 'chef', pin: '4450' },
  { email: 'chef7@gastroo.dev', password: 'Chef123!', displayName: 'Grzegorz Sushimaster', role: 'chef', pin: '4451' },
  { email: 'bartender3@gastroo.dev', password: 'Bar123456!', displayName: 'Ola Barmanka', role: 'bartender', pin: '5557' },
  { email: 'bartender4@gastroo.dev', password: 'Bar123456!', displayName: 'Wojciech Mixolog', role: 'bartender', pin: '5558' },
  { email: 'cashier3@gastroo.dev', password: 'Cashier123!', displayName: 'Beata Kasowa', role: 'cashier', pin: '6669' },
  { email: 'delivery3@gastroo.dev', password: 'Delivery123!', displayName: 'Marcin Kurierski', role: 'delivery', pin: '7779' },
  { email: 'sommelier2@gastroo.dev', password: 'Sommel123!', displayName: 'Karol Winoznawca', role: 'sommelier', pin: '5657' },
];

// authUsers are built by buildAuthUsers() below, after additionalOrganizations is defined.

const unassignedUsers = [
  {
    email: 'konsument1@gastroo.dev', password: 'Consumer123!', displayName: 'Katarzyna Konsument',
    favoriteRestaurantIds: ['gastroo-warszawa-central', 'gastroo-gdansk-riverside'],
    favoriteMenuItems: [
      { orgId: 'gastroo-core-org', restaurantId: 'gastroo-warszawa-central', itemName: 'Tagliatelle truflowe' },
      { orgId: 'gastroo-restauracja-org', restaurantId: 'gastroo-gdansk-riverside', itemName: 'Sandacz z palonym maslem' },
    ],
    loyaltyPoints: [
      { orgId: 'gastroo-core-org', restaurantId: 'gastroo-warszawa-central', points: 180, totalEarned: 240, tier: 'silver', lastActivityDayOffset: -2 },
      { orgId: 'gastroo-restauracja-org', restaurantId: 'gastroo-gdansk-riverside', points: 90, totalEarned: 90, tier: 'bronze', lastActivityDayOffset: -7 },
    ],
  },
  {
    email: 'konsument2@gastroo.dev', password: 'Consumer123!', displayName: 'Rafal Odkrywca',
    favoriteRestaurantIds: ['gastroo-krakow-old-town', 'gastroo-wroclaw-pizzeria'],
    favoriteMenuItems: [
      { orgId: 'gastroo-pizzeria-org', restaurantId: 'gastroo-wroclaw-pizzeria', itemName: 'Diavola' },
    ],
    loyaltyPoints: [
      { orgId: 'gastroo-pizzeria-org', restaurantId: 'gastroo-wroclaw-pizzeria', points: 70, totalEarned: 110, tier: 'bronze', lastActivityDayOffset: -4 },
    ],
  },
  {
    email: 'visitor@gastroo.dev', password: 'Visitor123!', displayName: 'Maja Visitor',
    favoriteRestaurantIds: ['gastroo-poznan-express'],
    favoriteMenuItems: [
      { orgId: 'gastroo-fastfood-org', restaurantId: 'gastroo-poznan-express', itemName: 'Double Smash' },
    ],
    loyaltyPoints: [],
  },
  {
    email: 'foodie1@gastroo.dev', password: 'Consumer123!', displayName: 'Natalia Foodie',
    favoriteRestaurantIds: ['gastroo-warszawa-central', 'gastroo-poznan-express'],
    favoriteMenuItems: [
      { orgId: 'gastroo-core-org', restaurantId: 'gastroo-warszawa-central', itemName: 'Burger angus' },
      { orgId: 'gastroo-fastfood-org', restaurantId: 'gastroo-poznan-express', itemName: 'BBQ Bacon Burger' },
    ],
    loyaltyPoints: [
      { orgId: 'gastroo-fastfood-org', restaurantId: 'gastroo-poznan-express', points: 220, totalEarned: 340, tier: 'gold', lastActivityDayOffset: -1 },
    ],
  },
  {
    email: 'foodie2@gastroo.dev', password: 'Consumer123!', displayName: 'Igor Smakosz',
    favoriteRestaurantIds: ['gastroo-gdansk-riverside'],
    favoriteMenuItems: [
      { orgId: 'gastroo-restauracja-org', restaurantId: 'gastroo-gdansk-riverside', itemName: 'Antrykot sezonowany' },
    ],
    loyaltyPoints: [
      { orgId: 'gastroo-restauracja-org', restaurantId: 'gastroo-gdansk-riverside', points: 310, totalEarned: 520, tier: 'gold', lastActivityDayOffset: -3 },
    ],
  },
  {
    email: 'foodie3@gastroo.dev', password: 'Consumer123!', displayName: 'Oliwia Explorer',
    favoriteRestaurantIds: ['gastroo-krakow-old-town', 'gastroo-wroclaw-pizzeria'],
    favoriteMenuItems: [
      { orgId: 'gastroo-pizzeria-org', restaurantId: 'gastroo-wroclaw-pizzeria', itemName: 'Burrata Fresca' },
    ],
    loyaltyPoints: [
      { orgId: 'gastroo-pizzeria-org', restaurantId: 'gastroo-wroclaw-pizzeria', points: 55, totalEarned: 85, tier: 'bronze', lastActivityDayOffset: -10 },
    ],
  },
  {
    email: 'foodie4@gastroo.dev', password: 'Consumer123!', displayName: 'Bartosz Weekendowy',
    favoriteRestaurantIds: ['gastroo-poznan-express'],
    favoriteMenuItems: [
      { orgId: 'gastroo-fastfood-org', restaurantId: 'gastroo-poznan-express', itemName: 'Spicy Jalapeno Burger' },
    ],
    loyaltyPoints: [
      { orgId: 'gastroo-fastfood-org', restaurantId: 'gastroo-poznan-express', points: 40, totalEarned: 40, tier: 'bronze', lastActivityDayOffset: -15 },
    ],
  },
  {
    email: 'foodie5@gastroo.dev', password: 'Consumer123!', displayName: 'Karina City Break',
    favoriteRestaurantIds: ['gastroo-gdansk-riverside', 'gastroo-wroclaw-pizzeria'],
    favoriteMenuItems: [
      { orgId: 'gastroo-pizzeria-org', restaurantId: 'gastroo-wroclaw-pizzeria', itemName: 'Truffle Bianca' },
      { orgId: 'gastroo-restauracja-org', restaurantId: 'gastroo-gdansk-riverside', itemName: 'Kaczka confit' },
    ],
    loyaltyPoints: [],
  },
  {
    email: 'foodie6@gastroo.dev', password: 'Consumer123!', displayName: 'Michal Lunch Hunter',
    favoriteRestaurantIds: ['gastroo-warszawa-central'],
    favoriteMenuItems: [
      { orgId: 'gastroo-core-org', restaurantId: 'gastroo-warszawa-central', itemName: 'Penne arrabbiata' },
    ],
    loyaltyPoints: [
      { orgId: 'gastroo-core-org', restaurantId: 'gastroo-warszawa-central', points: 125, totalEarned: 180, tier: 'silver', lastActivityDayOffset: -5 },
    ],
  },
  {
    email: 'foodie7@gastroo.dev', password: 'Consumer123!', displayName: 'Julia Wieczorna',
    favoriteRestaurantIds: ['gastroo-wroclaw-pizzeria'],
    favoriteMenuItems: [
      { orgId: 'gastroo-pizzeria-org', restaurantId: 'gastroo-wroclaw-pizzeria', itemName: 'Tiramisu' },
    ],
    loyaltyPoints: [
      { orgId: 'gastroo-pizzeria-org', restaurantId: 'gastroo-wroclaw-pizzeria', points: 260, totalEarned: 410, tier: 'gold', lastActivityDayOffset: -2 },
    ],
  },
  {
    email: 'foodie8@gastroo.dev', password: 'Consumer123!', displayName: 'Tomasz Degustator',
    favoriteRestaurantIds: ['gastroo-gdansk-riverside', 'gastroo-poznan-express'],
    favoriteMenuItems: [
      { orgId: 'gastroo-fastfood-org', restaurantId: 'gastroo-poznan-express', itemName: 'Milkshake waniliowy' },
      { orgId: 'gastroo-restauracja-org', restaurantId: 'gastroo-gdansk-riverside', itemName: 'Sandacz z palonym maslem' },
    ],
    loyaltyPoints: [
      { orgId: 'gastroo-fastfood-org', restaurantId: 'gastroo-poznan-express', points: 80, totalEarned: 120, tier: 'bronze', lastActivityDayOffset: -6 },
      { orgId: 'gastroo-restauracja-org', restaurantId: 'gastroo-gdansk-riverside', points: 140, totalEarned: 200, tier: 'silver', lastActivityDayOffset: -12 },
    ],
  },
  // ── Wave 2: consumers for new cities ───────────────────────────────────────
  {
    email: 'sushi-fan@gastroo.dev', password: 'Consumer123!', displayName: 'Paulina Sushimanka',
    favoriteRestaurantIds: ['gastroo-lodz-sushi', 'gastroo-kielce-ramen'],
    favoriteMenuItems: [
      { orgId: 'gastroo-sushi-org', restaurantId: 'gastroo-lodz-sushi', itemName: 'Dragon Roll' },
      { orgId: 'gastroo-ramen-org', restaurantId: 'gastroo-kielce-ramen', itemName: 'Tonkotsu Classic' },
    ],
    loyaltyPoints: [
      { orgId: 'gastroo-sushi-org', restaurantId: 'gastroo-lodz-sushi', points: 200, totalEarned: 320, tier: 'gold', lastActivityDayOffset: -1 },
      { orgId: 'gastroo-ramen-org', restaurantId: 'gastroo-kielce-ramen', points: 45, totalEarned: 45, tier: 'bronze', lastActivityDayOffset: -8 },
    ],
  },
  {
    email: 'steak-lover@gastroo.dev', password: 'Consumer123!', displayName: 'Krzysztof Miesozerca',
    favoriteRestaurantIds: ['gastroo-katowice-steak'],
    favoriteMenuItems: [
      { orgId: 'gastroo-steakhouse-org', restaurantId: 'gastroo-katowice-steak', itemName: 'Tomahawk 800g' },
    ],
    loyaltyPoints: [
      { orgId: 'gastroo-steakhouse-org', restaurantId: 'gastroo-katowice-steak', points: 380, totalEarned: 520, tier: 'gold', lastActivityDayOffset: -2 },
    ],
  },
  {
    email: 'wine-enthusiast@gastroo.dev', password: 'Consumer123!', displayName: 'Agnieszka Winolubna',
    favoriteRestaurantIds: ['gastroo-szczecin-wine', 'gastroo-katowice-steak'],
    favoriteMenuItems: [
      { orgId: 'gastroo-winebar-org', restaurantId: 'gastroo-szczecin-wine', itemName: 'Deska serów' },
      { orgId: 'gastroo-steakhouse-org', restaurantId: 'gastroo-katowice-steak', itemName: 'Filet Mignon 200g' },
    ],
    loyaltyPoints: [
      { orgId: 'gastroo-winebar-org', restaurantId: 'gastroo-szczecin-wine', points: 150, totalEarned: 200, tier: 'silver', lastActivityDayOffset: -3 },
    ],
  },
  {
    email: 'vegan-girl@gastroo.dev', password: 'Consumer123!', displayName: 'Zuzanna Roslinożerna',
    favoriteRestaurantIds: ['gastroo-lublin-vegan'],
    favoriteMenuItems: [
      { orgId: 'gastroo-vegan-org', restaurantId: 'gastroo-lublin-vegan', itemName: 'Buddha Bowl' },
      { orgId: 'gastroo-vegan-org', restaurantId: 'gastroo-lublin-vegan', itemName: 'Smoothie zielony' },
    ],
    loyaltyPoints: [
      { orgId: 'gastroo-vegan-org', restaurantId: 'gastroo-lublin-vegan', points: 95, totalEarned: 130, tier: 'bronze', lastActivityDayOffset: -4 },
    ],
  },
  {
    email: 'craft-beer@gastroo.dev', password: 'Consumer123!', displayName: 'Wojciech Piwosz',
    favoriteRestaurantIds: ['gastroo-bydgoszcz-pub'],
    favoriteMenuItems: [
      { orgId: 'gastroo-brewery-org', restaurantId: 'gastroo-bydgoszcz-pub', itemName: 'Wisła IPA' },
      { orgId: 'gastroo-brewery-org', restaurantId: 'gastroo-bydgoszcz-pub', itemName: 'Żeberka BBQ' },
    ],
    loyaltyPoints: [
      { orgId: 'gastroo-brewery-org', restaurantId: 'gastroo-bydgoszcz-pub', points: 280, totalEarned: 400, tier: 'gold', lastActivityDayOffset: -1 },
    ],
  },
  {
    email: 'pierogi-fan@gastroo.dev', password: 'Consumer123!', displayName: 'Hanna Pierogowa',
    favoriteRestaurantIds: ['gastroo-torun-pierogi', 'gastroo-bialystok-georgian'],
    favoriteMenuItems: [
      { orgId: 'gastroo-pierogi-org', restaurantId: 'gastroo-torun-pierogi', itemName: 'Pierogi kacze (10 szt.)' },
      { orgId: 'gastroo-georgian-org', restaurantId: 'gastroo-bialystok-georgian', itemName: 'Chaczapuri adżarskie' },
    ],
    loyaltyPoints: [
      { orgId: 'gastroo-pierogi-org', restaurantId: 'gastroo-torun-pierogi', points: 170, totalEarned: 250, tier: 'silver', lastActivityDayOffset: -5 },
      { orgId: 'gastroo-georgian-org', restaurantId: 'gastroo-bialystok-georgian', points: 60, totalEarned: 60, tier: 'bronze', lastActivityDayOffset: -9 },
    ],
  },
  {
    email: 'brunch-queen@gastroo.dev', password: 'Consumer123!', displayName: 'Maja Sniadaniowa',
    favoriteRestaurantIds: ['gastroo-opole-brunch', 'gastroo-lublin-vegan'],
    favoriteMenuItems: [
      { orgId: 'gastroo-brunch-org', restaurantId: 'gastroo-opole-brunch', itemName: 'Eggs Benedict' },
      { orgId: 'gastroo-brunch-org', restaurantId: 'gastroo-opole-brunch', itemName: 'Flat White' },
    ],
    loyaltyPoints: [
      { orgId: 'gastroo-brunch-org', restaurantId: 'gastroo-opole-brunch', points: 110, totalEarned: 160, tier: 'silver', lastActivityDayOffset: -2 },
    ],
  },
  {
    email: 'med-food@gastroo.dev', password: 'Consumer123!', displayName: 'Artur Srodziemnomorski',
    favoriteRestaurantIds: ['gastroo-rzeszow-grill', 'gastroo-szczecin-wine'],
    favoriteMenuItems: [
      { orgId: 'gastroo-medgrill-org', restaurantId: 'gastroo-rzeszow-grill', itemName: 'Mix grill (2 os.)' },
      { orgId: 'gastroo-medgrill-org', restaurantId: 'gastroo-rzeszow-grill', itemName: 'Falafel (6 szt.)' },
    ],
    loyaltyPoints: [
      { orgId: 'gastroo-medgrill-org', restaurantId: 'gastroo-rzeszow-grill', points: 190, totalEarned: 280, tier: 'silver', lastActivityDayOffset: -3 },
    ],
  },
] satisfies ConsumerSeedUser[];


// Przykładowe eventy demo (na najbliższy miesiąc, dayOffset od dziś)
export const demoEvents: SeedEventDefinition[] = [
  {
    id: 'event-1',
    orgId: 'gastroo-core-org',
    restaurantId: 'gastroo-warszawa-central',
    name: 'Wieczór z muzyką na żywo',
    description: 'Koncert jazzowy na żywo w każdą sobotę.',
    type: 'event',
    status: 'active',
    priority: 1,
    tags: ['muzyka', 'live', 'jazz'],
    schedule: {
      startDayOffset: 2,
      endDayOffset: 32,
      daysOfWeek: [6], // sobota
      timeRanges: [{ from: '19:00', to: '22:00' }],
    },
  },
  {
    id: 'event-2',
    orgId: 'gastroo-core-org',
    restaurantId: 'gastroo-warszawa-central',
    name: 'Happy Hours',
    description: 'Codziennie 16:00-18:00 -50% na wybrane napoje.',
    type: 'event',
    status: 'active',
    priority: 2,
    tags: ['happy hours', 'promocja'],
    schedule: {
      startDayOffset: 0,
      endDayOffset: 30,
      daysOfWeek: [1,2,3,4,5,6,0],
      timeRanges: [{ from: '16:00', to: '18:00' }],
    },
  },
  {
    id: 'event-3',
    orgId: 'gastroo-core-org',
    restaurantId: 'gastroo-warszawa-central',
    name: 'Warsztaty kulinarne',
    description: 'Niedzielne warsztaty gotowania dla dzieci.',
    type: 'event',
    status: 'scheduled',
    priority: 3,
    tags: ['warsztaty', 'dzieci'],
    schedule: {
      startDayOffset: 7,
      endDayOffset: 37,
      daysOfWeek: [0], // niedziela
      timeRanges: [{ from: '12:00', to: '14:00' }],
    },
  },
];

// masterConfig: SeedConfig = ... (DEMO USUNIĘTE)
const masterConfig: SeedConfig = {
  users: coreUsers,
  organization: {
    id: 'gastroo-core-org',
    name: 'Gastroo Space Core',
    slug: 'gastroo-space-core',
    type: 'restaurant',
    plan: 'free',
    features: [],
    location: { lat: 52.2297, lng: 21.0122 },
  },
  restaurant: {
    id: 'gastroo-warszawa-central',
    name: 'Gastroo Warszawa Central',
    address: {
      street: '',
      city: '',
      postalCode: '',
      country: 'Poland',
    },
    phone: '',
    timezone: 'Europe/Warsaw',
    location: { lat: 52.2297, lng: 21.0122 },
    settings: {
      currency: 'PLN',
      language: 'pl',
      bookingDuration: 60,
      depositAmount: 0,
    },
  },
  sections: [],
  tables: [],
  menuCategories: [],
  bookings: [
    { dayOffset: -1, bookingTime: '12:00', name: 'Lunch korporacyjny', guestCount: 6, status: 'confirmed' },
    { dayOffset: -1, bookingTime: '18:30', name: 'Kolacja biznesowa', guestCount: 4, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '10:00', name: 'Sniadanie VIP', guestCount: 2, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '12:30', name: 'Przerwa lunchowa', guestCount: 3, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '13:15', name: 'Anna Kowalska', guestCount: 2, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '14:00', name: 'Spotkanie firmowe', guestCount: 8, status: 'pending' },
    { dayOffset: 0, bookingTime: '17:00', name: 'Kawa po pracy', guestCount: 2, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '18:00', name: 'Randka', guestCount: 2, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '19:30', name: 'Grupa znajomych', guestCount: 5, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '20:00', name: 'Urodziny Marka', guestCount: 10, status: 'confirmed' },
    { dayOffset: 1, bookingTime: '12:00', name: 'Lunch team IT', guestCount: 4, status: 'confirmed' },
    { dayOffset: 1, bookingTime: '19:00', name: 'Kolacja rocznicowa', guestCount: 2, status: 'pending' },
    { dayOffset: 2, bookingTime: '13:00', name: 'Catering spotkanie', guestCount: 12, status: 'confirmed' },
  ],
  shifts: [],
  todoTasks: [],

  ingredients: [],
  recipes: [],
};

// Usunięto nieistniejące demoLokalConfig i demoBistroConfig oraz powiązane restauracje
// Usunięto fragmenty po demoBistroConfig. Jeśli chcesz dodać menuCategories, zrób to jawnie tutaj.

const fastFoodRestaurant: SeedRestaurantData = {
  restaurant: {
    id: 'gastroo-poznan-express',
    name: 'Gastroo Fast Express',
    address: {
      street: 'ul. Piatkowska 101',
      city: 'Poznan',
      postalCode: '60-648',
      country: 'Poland',
    },
    phone: '+48 61 222 33 44',
    timezone: 'Europe/Warsaw',
    location: { lat: 52.437, lng: 16.9195 },
    tableCount: 5,
    gbpAttributes: {
      petFriendly: false,
      lgbtFriendly: true,
      veganOptions: true,
      outdoorSeating: false,
      familyFriendly: true,
    },
    settings: {
      currency: 'PLN',
      language: 'pl',
      bookingDuration: 45,
      depositAmount: 0,
    },
  },
  sections: [
    { id: 'ff-counter', name: 'Counter', color: '#f97316', order: 0 },
    { id: 'ff-hall', name: 'Sala', color: '#22c55e', order: 1 },
  ],
  tables: [
    { id: 'ff-t1', number: 1, capacity: 2, shape: 'square', posX: 20, posY: 20, status: 'free', sectionId: 'ff-hall' },
    { id: 'ff-t2', number: 2, capacity: 4, shape: 'square', posX: 42, posY: 20, status: 'free', sectionId: 'ff-hall' },
    { id: 'ff-t3', number: 3, capacity: 4, shape: 'square', posX: 64, posY: 20, status: 'occupied', sectionId: 'ff-hall' },
    { id: 'ff-t4', number: 4, capacity: 2, shape: 'round', posX: 24, posY: 52, status: 'reserved', sectionId: 'ff-hall' },
    { id: 'ff-t5', number: 5, capacity: 2, shape: 'round', posX: 50, posY: 52, status: 'free', sectionId: 'ff-hall' },
  ],
  menuCategories: [
    {
      name: 'Burgery', order: 1,
      items: [
        { name: 'Classic Burger', price: 26, description: 'Wolowina 180g, cheddar, ogorek, sos house', available: true },
        { name: 'BBQ Bacon Burger', price: 31, description: 'Bekon, cebulka crispy, sos BBQ', available: true },
        { name: 'Spicy Jalapeno Burger', price: 30, description: 'Jalapeno, pepper jack, mayo chipotle', available: true },
        { name: 'Double Smash', price: 35, description: '2x wolowina, podwojny ser', available: true },
      ],
    },
    {
      name: 'Wrapy i kanapki', order: 2,
      items: [
        { name: 'Chicken Wrap', price: 24, description: 'Kurczak crispy, salata, sos czosnkowy', available: true },
        { name: 'Falafel Wrap', price: 22, description: 'Falafel, hummus, warzywa', available: true },
        { name: 'Steak Sandwich', price: 29, description: 'Wolowina, cebula karmelizowana, ser', available: true },
      ],
    },
    {
      name: 'Dodatki', order: 3,
      items: [
        { name: 'Frytki', price: 11, description: 'Porcja klasyczna', available: true },
        { name: 'Frytki z batata', price: 14, description: 'Porcja premium', available: true },
        { name: 'Onion Rings', price: 13, description: '8 sztuk', available: true },
        { name: 'Coleslaw', price: 8, description: 'Domowa salatka', available: true },
      ],
    },
    {
      name: 'Napoje', order: 4,
      items: [
        { name: 'Lemoniada cytrynowa', price: 9, description: '0.4L', available: true },
        { name: 'Iced Tea brzoskwinia', price: 9, description: '0.4L', available: true },
        { name: 'Milkshake waniliowy', price: 14, description: '0.35L', available: true },
      ],
    },
  ],
  bookings: [
    { dayOffset: -1, bookingTime: '12:00', name: 'Ekipa z biura', guestCount: 4, tableId: 'ff-t3', tableNumber: 3, status: 'confirmed' },
    { dayOffset: -1, bookingTime: '17:00', name: 'After work', guestCount: 3, tableId: 'ff-t2', tableNumber: 2, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '11:30', name: 'Szybki lunch', guestCount: 2, tableId: 'ff-t1', tableNumber: 1, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '12:00', name: 'Studenci', guestCount: 4, tableId: 'ff-t2', tableNumber: 2, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '12:45', name: 'Piotr i Kasia', guestCount: 2, tableId: 'ff-t5', tableNumber: 5, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '13:30', name: 'Dostawca UberEats', guestCount: 1, tableId: 'ff-t1', tableNumber: 1, status: 'pending' },
    { dayOffset: 0, bookingTime: '15:00', name: 'Rodzina K.', guestCount: 4, tableId: 'ff-t3', tableNumber: 3, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '17:30', name: 'Burger wieczor', guestCount: 3, tableId: 'ff-t2', tableNumber: 2, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '18:30', name: 'Ekipa biurowa', guestCount: 4, tableId: 'ff-t3', tableNumber: 3, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '19:00', name: 'Para mloda', guestCount: 2, tableId: 'ff-t4', tableNumber: 4, status: 'confirmed' },
    { dayOffset: 1, bookingTime: '12:00', name: 'Firma XYZ', guestCount: 4, tableId: 'ff-t3', tableNumber: 3, status: 'confirmed' },
    { dayOffset: 1, bookingTime: '18:30', name: 'Urodziny Tomka', guestCount: 4, tableId: 'ff-t2', tableNumber: 2, status: 'pending' },
    { dayOffset: 2, bookingTime: '12:15', name: 'Rodzina Nowakow', guestCount: 4, tableId: 'ff-t2', tableNumber: 2, status: 'confirmed' },
  ],
  shifts: [
    { role: 'manager', displayName: 'Oliwia Manager', startHour: 10, endHour: 18 },
    { role: 'waiter', displayName: 'Kamil Kelner', startHour: 11, endHour: 19 },
    { role: 'chef', displayName: 'Robert Szef Kuchni', startHour: 10, endHour: 18 },
    { role: 'cashier', displayName: 'Joanna Kwiatkowska', startHour: 11, endHour: 19 },
  ],
  todoTasks: [
    { title: 'Przygotuj mise en place', assignedToRoles: ['chef'], isGroupTask: false, priority: 'high', category: 'setup' },
    { title: 'Uzupelnij sosy i opakowania', assignedToRoles: ['waiter', 'cashier'], isGroupTask: true, priority: 'medium', category: 'setup' },
    { title: 'Zamkniecie kasy', assignedToRoles: ['cashier', 'manager'], isGroupTask: false, priority: 'high', category: 'finance' },
  ],
  ingredients: [],
  recipes: [],
};

const pizzeriaRestaurant: SeedRestaurantData = {
  restaurant: {
    id: 'gastroo-wroclaw-pizzeria',
    name: 'Gastroo Pizzeria Wroclaw',
    address: {
      street: 'ul. Sadowa 24',
      city: 'Wroclaw',
      postalCode: '50-121',
      country: 'Poland',
    },
    phone: '+48 71 300 21 37',
    timezone: 'Europe/Warsaw',
    location: { lat: 51.1079, lng: 17.0385 },
    tableCount: 5,
    gbpAttributes: {
      petFriendly: true,
      lgbtFriendly: true,
      veganOptions: true,
      outdoorSeating: true,
      familyFriendly: true,
    },
    settings: {
      currency: 'PLN',
      language: 'pl',
      bookingDuration: 75,
      depositAmount: 20,
    },
  },
  sections: [
    { id: 'pz-main', name: 'Sala glowna', color: '#dc2626', order: 0 },
    { id: 'pz-terrace', name: 'Taras', color: '#16a34a', order: 1 },
  ],
  tables: [
    { id: 'pz-t1', number: 1, capacity: 2, shape: 'round', posX: 20, posY: 18, status: 'free', sectionId: 'pz-main' },
    { id: 'pz-t2', number: 2, capacity: 4, shape: 'square', posX: 42, posY: 18, status: 'occupied', sectionId: 'pz-main' },
    { id: 'pz-t3', number: 3, capacity: 4, shape: 'square', posX: 66, posY: 18, status: 'free', sectionId: 'pz-main' },
    { id: 'pz-t4', number: 4, capacity: 6, shape: 'rectangle', posX: 28, posY: 52, status: 'reserved', sectionId: 'pz-terrace' },
    { id: 'pz-t5', number: 5, capacity: 2, shape: 'round', posX: 58, posY: 52, status: 'free', sectionId: 'pz-terrace' },
  ],
  menuCategories: [
    {
      name: 'Pizza klasyczna', order: 1,
      items: [
        { name: 'Margherita', price: 28, description: 'Sos pomidorowy, mozzarella, bazylia', available: true },
        { name: 'Capricciosa', price: 34, description: 'Szynka cotto, pieczarki, mozzarella', available: true },
        { name: 'Diavola', price: 36, description: 'Salami piccante, chili, cebula', available: true },
        { name: 'Prosciutto e Funghi', price: 35, description: 'Szynka, pieczarki, oregano', available: true },
      ],
    },
    {
      name: 'Pizza premium', order: 2,
      items: [
        { name: 'Truffle Bianca', price: 44, description: 'Sos smietanowy, trufla, rukola', available: true },
        { name: 'Burrata Fresca', price: 42, description: 'Pomidorki cherry, burrata, pesto', available: true },
        { name: 'Quattro Formaggi', price: 40, description: 'Mozzarella, gorgonzola, parmezan, scamorza', available: true },
      ],
    },
    {
      name: 'Dodatki i napoje', order: 3,
      items: [
        { name: 'Focaccia czosnkowa', price: 14, description: 'Pieczywo z pieca, czosnek i ziola', available: true },
        { name: 'Tiramisu', price: 18, description: 'Klasyczny deser wloski', available: true },
        { name: 'Lemoniada domowa', price: 11, description: '0.4L', available: true },
      ],
    },
  ],
  bookings: [
    { dayOffset: -1, bookingTime: '13:00', name: 'Pizza Friday team', guestCount: 6, tableId: 'pz-t4', tableNumber: 4, status: 'confirmed' },
    { dayOffset: -1, bookingTime: '19:00', name: 'Wieczor wloski', guestCount: 4, tableId: 'pz-t2', tableNumber: 2, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '12:00', name: 'Lunch studencki', guestCount: 3, tableId: 'pz-t3', tableNumber: 3, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '12:30', name: 'Mama z dziecmi', guestCount: 4, tableId: 'pz-t2', tableNumber: 2, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '13:30', name: 'Spotkanie biznesowe', guestCount: 2, tableId: 'pz-t1', tableNumber: 1, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '15:00', name: 'Pizza party Ola', guestCount: 6, tableId: 'pz-t4', tableNumber: 4, status: 'pending' },
    { dayOffset: 0, bookingTime: '17:30', name: 'Kolacja rodzinna', guestCount: 4, tableId: 'pz-t2', tableNumber: 2, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '18:00', name: 'Randka na tarasie', guestCount: 2, tableId: 'pz-t5', tableNumber: 5, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '19:00', name: 'Urodziny Julii', guestCount: 6, tableId: 'pz-t4', tableNumber: 4, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '20:00', name: 'Wieczor degustacyjny', guestCount: 4, tableId: 'pz-t3', tableNumber: 3, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '20:30', name: 'Para zakochanych', guestCount: 2, tableId: 'pz-t1', tableNumber: 1, status: 'confirmed' },
    { dayOffset: 1, bookingTime: '13:00', name: 'Lunch biznesowy', guestCount: 2, tableId: 'pz-t1', tableNumber: 1, status: 'confirmed' },
    { dayOffset: 2, bookingTime: '14:00', name: 'Impreza firmowa', guestCount: 6, tableId: 'pz-t4', tableNumber: 4, status: 'pending' },
  ],
  shifts: [
    { role: 'manager', displayName: 'Emilia Manager', startHour: 12, endHour: 20 },
    { role: 'supervisor', displayName: 'Patryk Supervisor', startHour: 13, endHour: 21 },
    { role: 'waiter', displayName: 'Wiktoria Kelner', startHour: 12, endHour: 20 },
    { role: 'chef', displayName: 'Mateusz Chef', startHour: 11, endHour: 19 },
    { role: 'bartender', displayName: 'Szymon Barman', startHour: 14, endHour: 22 },
    { role: 'cashier', displayName: 'Monika Kasjerka', startHour: 12, endHour: 20 },
    { role: 'delivery', displayName: 'Adrian Dostawca', startHour: 12, endHour: 20 },
  ],
  todoTasks: [
    { title: 'Rozgrzej piec do pizzy', assignedToRoles: ['chef'], isGroupTask: false, priority: 'high', category: 'setup' },
    { title: 'Przygotuj stanowisko dostaw', assignedToRoles: ['delivery', 'cashier'], isGroupTask: true, priority: 'medium', category: 'setup' },
    { title: 'Weryfikacja rezerwacji wieczornych', assignedToRoles: ['manager', 'supervisor'], isGroupTask: false, priority: 'high', category: 'general' },
  ],
  ingredients: [],
  recipes: [],
};

// ── Łódź – Sushi Bar ───────────────────────────────────────────────────────────
const sushiBarRestaurant: SeedRestaurantData = {
  restaurant: {
    id: 'gastroo-lodz-sushi',
    name: 'Sakura Sushi Łódź',
    address: { street: 'ul. Piotrkowska 78', city: 'Łódź', postalCode: '90-102', country: 'Poland' },
    phone: '+48 42 111 22 33',
    timezone: 'Europe/Warsaw',
    location: { lat: 51.7592, lng: 19.4560 },
    tableCount: 8,
    tags: ['sushi', 'japanese', 'asian'],
    gbpAttributes: { petFriendly: false, lgbtFriendly: true, veganOptions: true, outdoorSeating: false, familyFriendly: true },
    settings: { currency: 'PLN', language: 'pl', bookingDuration: 90, depositAmount: 30 },
  },
  sections: [
    { id: 'su-bar', name: 'Sushi Bar', color: '#e11d48', order: 0 },
    { id: 'su-main', name: 'Sala', color: '#0ea5e9', order: 1 },
  ],
  tables: [
    { id: 'su-t1', number: 1, capacity: 2, shape: 'round', posX: 15, posY: 20, status: 'free', sectionId: 'su-bar' },
    { id: 'su-t2', number: 2, capacity: 2, shape: 'round', posX: 35, posY: 20, status: 'free', sectionId: 'su-bar' },
    { id: 'su-t3', number: 3, capacity: 4, shape: 'square', posX: 55, posY: 20, status: 'occupied', sectionId: 'su-bar' },
    { id: 'su-t4', number: 4, capacity: 4, shape: 'square', posX: 20, posY: 55, status: 'free', sectionId: 'su-main' },
    { id: 'su-t5', number: 5, capacity: 6, shape: 'rectangle', posX: 50, posY: 55, status: 'reserved', sectionId: 'su-main' },
    { id: 'su-t6', number: 6, capacity: 2, shape: 'round', posX: 78, posY: 55, status: 'free', sectionId: 'su-main' },
    { id: 'su-t7', number: 7, capacity: 8, shape: 'rectangle', posX: 35, posY: 82, status: 'free', sectionId: 'su-main' },
    { id: 'su-t8', number: 8, capacity: 2, shape: 'round', posX: 70, posY: 82, status: 'free', sectionId: 'su-main' },
  ],
  menuCategories: [
    { name: 'Nigiri', order: 1, items: [
      { name: 'Nigiri łosoś', price: 12, description: '2 szt., świeży łosoś', available: true, allergens: ['fish'] },
      { name: 'Nigiri tuńczyk', price: 14, description: '2 szt., tuńczyk sashimi grade', available: true, allergens: ['fish'] },
      { name: 'Nigiri krewetka', price: 13, description: '2 szt., krewetka gotowana', available: true, allergens: ['crustaceans'] },
      { name: 'Nigiri węgorz', price: 16, description: '2 szt., unagi z sosem kabayaki', available: true, allergens: ['fish', 'soy'] },
    ]},
    { name: 'Maki & Uramaki', order: 2, items: [
      { name: 'California Roll', price: 28, description: '8 szt., krab, awokado, ogórek', available: true },
      { name: 'Spicy Tuna Roll', price: 32, description: '8 szt., tuńczyk, mayo chili', available: true, allergens: ['fish', 'eggs'] },
      { name: 'Dragon Roll', price: 38, description: '8 szt., krewetka tempura, awokado, unagi sos', available: true, allergens: ['crustaceans', 'gluten'] },
      { name: 'Veggie Roll', price: 24, description: '8 szt., awokado, ogórek, rzodkiewka', available: true, vegan: true },
      { name: 'Rainbow Roll', price: 42, description: '8 szt., mix ryb, awokado', available: true, allergens: ['fish'] },
    ]},
    { name: 'Sashimi', order: 3, items: [
      { name: 'Sashimi mix (12 szt.)', price: 58, description: 'Łosoś, tuńczyk, maślana', available: true, allergens: ['fish'] },
      { name: 'Sashimi łosoś (6 szt.)', price: 34, description: 'Premium Norwegian', available: true, allergens: ['fish'] },
    ]},
    { name: 'Dania ciepłe', order: 4, items: [
      { name: 'Ramen miso', price: 36, description: 'Pasta miso, chashu, jajko ajitama, nori', available: true, allergens: ['soy', 'eggs', 'gluten'] },
      { name: 'Gyoza (6 szt.)', price: 22, description: 'Pierożki z wieprzowiną, sos ponzu', available: true, allergens: ['gluten', 'soy'] },
      { name: 'Tempura krewetki', price: 34, description: '6 szt., sos tentsuyu', available: true, allergens: ['crustaceans', 'gluten'] },
    ]},
    { name: 'Napoje', order: 5, items: [
      { name: 'Sake Junmai', price: 28, description: '180ml', available: true },
      { name: 'Matcha Latte', price: 16, description: 'Na mleku owsianym', available: true },
      { name: 'Ramune', price: 12, description: 'Japoński napój gazowany', available: true },
    ]},
  ],
  bookings: [
    { dayOffset: -1, bookingTime: '12:00', name: 'Lunch japoński team', guestCount: 6, tableId: 'su-t5', tableNumber: 5, status: 'confirmed' },
    { dayOffset: -1, bookingTime: '19:00', name: 'Sushi date Wiktor', guestCount: 2, tableId: 'su-t1', tableNumber: 1, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '12:00', name: 'Lunch bento box', guestCount: 4, tableId: 'su-t4', tableNumber: 4, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '12:30', name: 'Sushi dla dwojga', guestCount: 2, tableId: 'su-t2', tableNumber: 2, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '13:00', name: 'Grupa studentów', guestCount: 6, tableId: 'su-t5', tableNumber: 5, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '17:00', name: 'Happy hour sake', guestCount: 4, tableId: 'su-t3', tableNumber: 3, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '18:00', name: 'Kolacja degustacyjna', guestCount: 4, tableId: 'su-t5', tableNumber: 5, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '19:00', name: 'Wieczor omakase', guestCount: 8, tableId: 'su-t7', tableNumber: 7, status: 'pending' },
    { dayOffset: 0, bookingTime: '19:30', name: 'Para Nowak', guestCount: 2, tableId: 'su-t1', tableNumber: 1, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '20:00', name: 'Urodziny Ani', guestCount: 6, tableId: 'su-t5', tableNumber: 5, status: 'confirmed' },
    { dayOffset: 1, bookingTime: '12:30', name: 'Lunch firmowy', guestCount: 8, tableId: 'su-t7', tableNumber: 7, status: 'confirmed' },
    { dayOffset: 2, bookingTime: '17:00', name: 'Urodziny Marty', guestCount: 6, tableId: 'su-t5', tableNumber: 5, status: 'pending' },
  ],
  shifts: [
    { role: 'manager', displayName: 'Jakub Zmianowicz', startHour: 11, endHour: 21 },
    { role: 'chef', displayName: 'Grzegorz Sushimaster', startHour: 10, endHour: 22 },
    { role: 'waiter', displayName: 'Zofia Kelnerka', startHour: 11, endHour: 21 },
    { role: 'waiter', displayName: 'Konrad Obslugowicz', startHour: 16, endHour: 23 },
  ],
  todoTasks: [
    { title: 'Przygotuj ryż sushi', assignedToRoles: ['chef'], isGroupTask: false, priority: 'high', category: 'setup' },
    { title: 'Sprawdź dostawę ryb', assignedToRoles: ['chef', 'manager'], isGroupTask: false, priority: 'high', category: 'general' },
    { title: 'Uzupełnij sos sojowy na stolikach', assignedToRoles: ['waiter'], isGroupTask: true, priority: 'medium', category: 'setup' },
  ],
  ingredients: [],
  recipes: [],
};

// ── Katowice – Steakhouse ──────────────────────────────────────────────────────
const steakhouseRestaurant: SeedRestaurantData = {
  restaurant: {
    id: 'gastroo-katowice-steak',
    name: 'Angus & Co. Katowice',
    address: { street: 'ul. Mariacka 15', city: 'Katowice', postalCode: '40-014', country: 'Poland' },
    phone: '+48 32 444 55 66',
    timezone: 'Europe/Warsaw',
    location: { lat: 50.2599, lng: 19.0216 },
    tableCount: 10,
    tags: ['steakhouse', 'grill', 'premium'],
    gbpAttributes: { petFriendly: false, lgbtFriendly: true, veganOptions: false, outdoorSeating: true, familyFriendly: false },
    settings: { currency: 'PLN', language: 'pl', bookingDuration: 120, depositAmount: 50 },
  },
  sections: [
    { id: 'stk-main', name: 'Sala główna', color: '#7c2d12', order: 0 },
    { id: 'stk-vip', name: 'VIP', color: '#c5a059', order: 1 },
    { id: 'stk-patio', name: 'Patio', color: '#15803d', order: 2 },
  ],
  tables: [
    { id: 'stk-t1', number: 1, capacity: 2, shape: 'round', posX: 15, posY: 20, status: 'free', sectionId: 'stk-main' },
    { id: 'stk-t2', number: 2, capacity: 4, shape: 'square', posX: 38, posY: 20, status: 'occupied', sectionId: 'stk-main' },
    { id: 'stk-t3', number: 3, capacity: 4, shape: 'square', posX: 62, posY: 20, status: 'free', sectionId: 'stk-main' },
    { id: 'stk-t4', number: 4, capacity: 2, shape: 'round', posX: 85, posY: 20, status: 'free', sectionId: 'stk-main' },
    { id: 'stk-t5', number: 5, capacity: 6, shape: 'rectangle', posX: 25, posY: 50, status: 'reserved', sectionId: 'stk-vip' },
    { id: 'stk-t6', number: 6, capacity: 8, shape: 'rectangle', posX: 65, posY: 50, status: 'free', sectionId: 'stk-vip' },
    { id: 'stk-t7', number: 7, capacity: 4, shape: 'square', posX: 15, posY: 80, status: 'free', sectionId: 'stk-patio' },
    { id: 'stk-t8', number: 8, capacity: 4, shape: 'square', posX: 38, posY: 80, status: 'free', sectionId: 'stk-patio' },
    { id: 'stk-t9', number: 9, capacity: 2, shape: 'round', posX: 62, posY: 80, status: 'free', sectionId: 'stk-patio' },
    { id: 'stk-t10', number: 10, capacity: 2, shape: 'round', posX: 85, posY: 80, status: 'free', sectionId: 'stk-patio' },
  ],
  menuCategories: [
    { name: 'Steki', order: 1, items: [
      { name: 'Ribeye 300g', price: 89, description: 'Dojrzewany 28 dni, masło ziołowe', available: true },
      { name: 'New York Strip 350g', price: 95, description: 'USDA Choice, sos bearnaise', available: true },
      { name: 'Filet Mignon 200g', price: 109, description: 'Polędwica wołowa, redukcja z Porto', available: true },
      { name: 'T-Bone 500g', price: 119, description: 'Na dwoje, grill na węglu drzewnym', available: true },
      { name: 'Tomahawk 800g', price: 179, description: 'Dla 2-3 osób, sos chimichurri', available: true },
    ]},
    { name: 'Przystawki', order: 2, items: [
      { name: 'Tatar wołowy', price: 38, description: 'Z polędwicy, kaparowy majonez', available: true, allergens: ['eggs'] },
      { name: 'Carpaccio z polędwicy', price: 36, description: 'Rukola, parmezan, oliwa truflowa', available: true, allergens: ['milk'] },
      { name: 'Krewetki king prawns', price: 42, description: '6 szt., masło czosnkowe', available: true, allergens: ['crustaceans', 'milk'] },
    ]},
    { name: 'Dodatki', order: 3, items: [
      { name: 'Frytki truflowe', price: 18, description: 'Z parmezanem', available: true, allergens: ['milk'] },
      { name: 'Pieczone ziemniaki', price: 14, description: 'Ze śmietaną i szczypiorkiem', available: true, allergens: ['milk'] },
      { name: 'Grillowane warzywa', price: 16, description: 'Sezonowy mix', available: true, vegan: true },
      { name: 'Sałatka Caesar', price: 22, description: 'Dresing anchois, grzanki', available: true, allergens: ['gluten', 'fish', 'eggs'] },
    ]},
    { name: 'Desery', order: 4, items: [
      { name: 'Brownie czekoladowe', price: 24, description: 'Lody waniliowe, sos karmelowy', available: true, allergens: ['gluten', 'milk', 'eggs'] },
      { name: 'Crème brûlée', price: 22, description: 'Klasyczny deser', available: true, allergens: ['milk', 'eggs'] },
    ]},
    { name: 'Wina & alkohole', order: 5, items: [
      { name: 'Malbec Reserva', price: 38, description: 'Argentyna, kieliszek 150ml', available: true },
      { name: 'Cabernet Sauvignon', price: 42, description: 'Chile, kieliszek 150ml', available: true },
      { name: 'Whisky single malt', price: 36, description: 'Glenfiddich 12Y, 40ml', available: true },
    ]},
  ],
  bookings: [
    { dayOffset: -1, bookingTime: '19:00', name: 'Kolacja VIP Prezes', guestCount: 4, tableId: 'stk-t5', tableNumber: 5, status: 'confirmed' },
    { dayOffset: -1, bookingTime: '20:30', name: 'Steak Night para', guestCount: 2, tableId: 'stk-t4', tableNumber: 4, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '12:30', name: 'Lunch z klientem', guestCount: 4, tableId: 'stk-t3', tableNumber: 3, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '13:00', name: 'Business lunch CEO', guestCount: 2, tableId: 'stk-t1', tableNumber: 1, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '17:30', name: 'After work steak', guestCount: 4, tableId: 'stk-t7', tableNumber: 7, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '18:30', name: 'Rocznica slubu', guestCount: 2, tableId: 'stk-t1', tableNumber: 1, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '19:00', name: 'Kolacja biznesowa', guestCount: 4, tableId: 'stk-t2', tableNumber: 2, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '19:30', name: 'Tomahawk Night', guestCount: 8, tableId: 'stk-t6', tableNumber: 6, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '20:00', name: 'VIP Kowalski', guestCount: 6, tableId: 'stk-t5', tableNumber: 5, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '20:30', name: 'Wieczor degustacji win', guestCount: 4, tableId: 'stk-t8', tableNumber: 8, status: 'pending' },
    { dayOffset: 1, bookingTime: '19:00', name: 'Date Night', guestCount: 2, tableId: 'stk-t4', tableNumber: 4, status: 'confirmed' },
    { dayOffset: 2, bookingTime: '13:00', name: 'Impreza firmowa', guestCount: 8, tableId: 'stk-t6', tableNumber: 6, status: 'pending' },
  ],
  shifts: [
    { role: 'manager', displayName: 'Martyna Salowa', startHour: 14, endHour: 23 },
    { role: 'chef', displayName: 'Lukasz Pizzaiolo', startHour: 12, endHour: 22 },
    { role: 'waiter', displayName: 'Alicja Serwisowa', startHour: 14, endHour: 23 },
    { role: 'sommelier', displayName: 'Karol Winoznawca', startHour: 16, endHour: 23 },
    { role: 'bartender', displayName: 'Wojciech Mixolog', startHour: 16, endHour: 1 },
  ],
  todoTasks: [
    { title: 'Sprawdź temperaturę dojrzewalni mięs', assignedToRoles: ['chef'], isGroupTask: false, priority: 'high', category: 'safety' },
    { title: 'Uzupełnij kartę win', assignedToRoles: ['sommelier', 'manager'], isGroupTask: false, priority: 'medium', category: 'general' },
    { title: 'Polerowanie sztućców VIP', assignedToRoles: ['waiter'], isGroupTask: true, priority: 'medium', category: 'setup' },
  ],
  ingredients: [],
  recipes: [],
};

// ── Szczecin – Wine Bar & Bistro ───────────────────────────────────────────────
const wineBarRestaurant: SeedRestaurantData = {
  restaurant: {
    id: 'gastroo-szczecin-wine',
    name: 'Winnica Bistro Szczecin',
    address: { street: 'ul. Jagiellońska 5', city: 'Szczecin', postalCode: '70-382', country: 'Poland' },
    phone: '+48 91 555 66 77',
    timezone: 'Europe/Warsaw',
    location: { lat: 53.4285, lng: 14.5528 },
    tableCount: 6,
    tags: ['wine', 'bistro', 'tapas'],
    gbpAttributes: { petFriendly: false, lgbtFriendly: true, veganOptions: true, outdoorSeating: true, familyFriendly: false },
    settings: { currency: 'PLN', language: 'pl', bookingDuration: 90, depositAmount: 25 },
  },
  sections: [
    { id: 'wb-cellar', name: 'Piwniczka', color: '#6d28d9', order: 0 },
    { id: 'wb-garden', name: 'Ogródek', color: '#059669', order: 1 },
  ],
  tables: [
    { id: 'wb-t1', number: 1, capacity: 2, shape: 'round', posX: 20, posY: 25, status: 'free', sectionId: 'wb-cellar' },
    { id: 'wb-t2', number: 2, capacity: 4, shape: 'square', posX: 50, posY: 25, status: 'free', sectionId: 'wb-cellar' },
    { id: 'wb-t3', number: 3, capacity: 6, shape: 'rectangle', posX: 80, posY: 25, status: 'occupied', sectionId: 'wb-cellar' },
    { id: 'wb-t4', number: 4, capacity: 2, shape: 'round', posX: 20, posY: 65, status: 'free', sectionId: 'wb-garden' },
    { id: 'wb-t5', number: 5, capacity: 4, shape: 'square', posX: 50, posY: 65, status: 'reserved', sectionId: 'wb-garden' },
    { id: 'wb-t6', number: 6, capacity: 4, shape: 'square', posX: 80, posY: 65, status: 'free', sectionId: 'wb-garden' },
  ],
  menuCategories: [
    { name: 'Tapas & przystawki', order: 1, items: [
      { name: 'Deska serów', price: 42, description: 'Mix 5 serów, marmolada figowa', available: true, allergens: ['milk'] },
      { name: 'Bruschetta pomidorowa', price: 18, description: 'Pomidory, bazylia, oliwa', available: true, allergens: ['gluten'], vegan: true },
      { name: 'Oliwki marynowane', price: 14, description: 'Mix z ziołami prowansalskimi', available: true, vegan: true },
      { name: 'Paté z kaczki', price: 28, description: 'Z konfiturą z cebuli', available: true, allergens: ['gluten'] },
      { name: 'Hummus z grillowanym pieczywem', price: 20, description: 'Ciecierzyca, tahini, za\'atar', available: true, vegan: true, allergens: ['sesame', 'gluten'] },
    ]},
    { name: 'Dania główne', order: 2, items: [
      { name: 'Risotto z borowikami', price: 44, description: 'Grzyby leśne, parmezan, masło truflowe', available: true, allergens: ['milk'] },
      { name: 'Steak tartare', price: 48, description: 'Polędwica, żółtko, kaparsy', available: true, allergens: ['eggs'] },
      { name: 'Ravioli z ricottą i szpinakiem', price: 38, description: 'Masło szałwiowe', available: true, allergens: ['gluten', 'milk', 'eggs'] },
    ]},
    { name: 'Wina kieliszek', order: 3, items: [
      { name: 'Sauvignon Blanc (NZ)', price: 28, description: '150ml, Marlborough', available: true },
      { name: 'Pinot Noir (Burgundy)', price: 36, description: '150ml, Côte de Beaune', available: true },
      { name: 'Prosecco', price: 22, description: '150ml, Veneto', available: true },
      { name: 'Chianti Classico', price: 32, description: '150ml, Toskania', available: true },
    ]},
  ],
  bookings: [
    { dayOffset: -1, bookingTime: '17:00', name: 'Wine Wednesday', guestCount: 4, tableId: 'wb-t2', tableNumber: 2, status: 'confirmed' },
    { dayOffset: -1, bookingTime: '19:00', name: 'Kolacja degustacyjna', guestCount: 6, tableId: 'wb-t3', tableNumber: 3, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '12:00', name: 'Brunch z winem', guestCount: 2, tableId: 'wb-t1', tableNumber: 1, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '14:00', name: 'Afternoon tasting', guestCount: 4, tableId: 'wb-t5', tableNumber: 5, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '16:00', name: 'Happy hour ogrodek', guestCount: 4, tableId: 'wb-t4', tableNumber: 4, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '17:30', name: 'After work drinks', guestCount: 4, tableId: 'wb-t5', tableNumber: 5, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '18:00', name: 'Degustacja win', guestCount: 6, tableId: 'wb-t3', tableNumber: 3, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '19:00', name: 'Romantyczna kolacja', guestCount: 2, tableId: 'wb-t1', tableNumber: 1, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '19:30', name: 'Wieczor z sommelierem', guestCount: 4, tableId: 'wb-t2', tableNumber: 2, status: 'pending' },
    { dayOffset: 0, bookingTime: '20:00', name: 'Spotkanie biznesowe', guestCount: 6, tableId: 'wb-t3', tableNumber: 3, status: 'confirmed' },
    { dayOffset: 1, bookingTime: '18:00', name: 'Kolacja firmowa', guestCount: 4, tableId: 'wb-t6', tableNumber: 6, status: 'confirmed' },
    { dayOffset: 2, bookingTime: '19:00', name: 'Wieczor toskanski', guestCount: 6, tableId: 'wb-t3', tableNumber: 3, status: 'pending' },
  ],
  shifts: [
    { role: 'manager', displayName: 'Damian Organizator', startHour: 14, endHour: 23 },
    { role: 'sommelier', displayName: 'Sylwia Sommelier', startHour: 15, endHour: 23 },
    { role: 'waiter', displayName: 'Zofia Kelnerka', startHour: 14, endHour: 22 },
    { role: 'chef', displayName: 'Natalia Sous-Chef', startHour: 12, endHour: 22 },
  ],
  todoTasks: [
    { title: 'Sprawdź temperaturę win w piwnicy', assignedToRoles: ['sommelier'], isGroupTask: false, priority: 'high', category: 'safety' },
    { title: 'Przygotuj menu degustacyjne na wieczór', assignedToRoles: ['chef', 'sommelier'], isGroupTask: false, priority: 'high', category: 'setup' },
  ],
  ingredients: [],
  recipes: [],
};

// ── Lublin – Vegan Cafe ────────────────────────────────────────────────────────
const veganCafeRestaurant: SeedRestaurantData = {
  restaurant: {
    id: 'gastroo-lublin-vegan',
    name: 'Green Plate Lublin',
    address: { street: 'ul. Krakowskie Przedmieście 31', city: 'Lublin', postalCode: '20-002', country: 'Poland' },
    phone: '+48 81 333 44 55',
    timezone: 'Europe/Warsaw',
    location: { lat: 51.2465, lng: 22.5684 },
    tableCount: 7,
    tags: ['vegan', 'organic', 'healthy'],
    gbpAttributes: { petFriendly: true, lgbtFriendly: true, veganOptions: true, outdoorSeating: true, familyFriendly: true },
    settings: { currency: 'PLN', language: 'pl', bookingDuration: 60, depositAmount: 0 },
  },
  sections: [
    { id: 'vg-inside', name: 'Wnętrze', color: '#22c55e', order: 0 },
    { id: 'vg-patio', name: 'Patio', color: '#a3e635', order: 1 },
  ],
  tables: [
    { id: 'vg-t1', number: 1, capacity: 2, shape: 'round', posX: 15, posY: 22, status: 'free', sectionId: 'vg-inside' },
    { id: 'vg-t2', number: 2, capacity: 4, shape: 'square', posX: 40, posY: 22, status: 'free', sectionId: 'vg-inside' },
    { id: 'vg-t3', number: 3, capacity: 4, shape: 'square', posX: 65, posY: 22, status: 'occupied', sectionId: 'vg-inside' },
    { id: 'vg-t4', number: 4, capacity: 6, shape: 'rectangle', posX: 40, posY: 50, status: 'free', sectionId: 'vg-inside' },
    { id: 'vg-t5', number: 5, capacity: 2, shape: 'round', posX: 20, posY: 78, status: 'free', sectionId: 'vg-patio' },
    { id: 'vg-t6', number: 6, capacity: 4, shape: 'square', posX: 48, posY: 78, status: 'reserved', sectionId: 'vg-patio' },
    { id: 'vg-t7', number: 7, capacity: 2, shape: 'round', posX: 75, posY: 78, status: 'free', sectionId: 'vg-patio' },
  ],
  menuCategories: [
    { name: 'Śniadania', order: 1, items: [
      { name: 'Owsianka z owocami', price: 22, description: 'Płatki owsiane, mleko kokosowe, owoce sezonowe, granola', available: true, vegan: true },
      { name: 'Toast awokado', price: 26, description: 'Chleb na zakwasie, awokado, kiełki, pestki', available: true, vegan: true, allergens: ['gluten'] },
      { name: 'Smoothie bowl', price: 28, description: 'Acai, banana, jagody, chia', available: true, vegan: true },
    ]},
    { name: 'Lunche', order: 2, items: [
      { name: 'Buddha Bowl', price: 32, description: 'Quinoa, ciecierzyca, bataty, awokado, tahini', available: true, vegan: true },
      { name: 'Burger z ciecierzycy', price: 30, description: 'Bułka bezglutenowa, kimchi, sos BBQ', available: true, vegan: true, glutenFree: true },
      { name: 'Pad Thai tofu', price: 28, description: 'Makaron ryżowy, tofu, orzeszki, limonka', available: true, vegan: true, allergens: ['peanuts', 'soy'] },
      { name: 'Zupa dnia', price: 18, description: 'Zmienia się codziennie', available: true, vegan: true },
    ]},
    { name: 'Napoje', order: 3, items: [
      { name: 'Matcha latte', price: 16, description: 'Na mleku owsianym', available: true, vegan: true },
      { name: 'Cold brew', price: 14, description: '350ml, Specialty grade', available: true, vegan: true },
      { name: 'Smoothie zielony', price: 18, description: 'Szpinak, banana, mango, spirulina', available: true, vegan: true },
      { name: 'Kombucha', price: 14, description: 'Domowej produkcji, 330ml', available: true, vegan: true },
    ]},
    { name: 'Desery', order: 4, items: [
      { name: 'Ciasto marchewkowe', price: 18, description: 'Krem kokosowy, cynamon', available: true, vegan: true },
      { name: 'Brownie z batatów', price: 16, description: 'Sos czekoladowy, maliny', available: true, vegan: true },
    ]},
  ],
  bookings: [
    { dayOffset: -1, bookingTime: '08:30', name: 'Poranne smoothie team', guestCount: 4, tableId: 'vg-t2', tableNumber: 2, status: 'confirmed' },
    { dayOffset: -1, bookingTime: '12:00', name: 'Vegan lunch dating', guestCount: 2, tableId: 'vg-t1', tableNumber: 1, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '08:00', name: 'Sniadanie zdrowe', guestCount: 2, tableId: 'vg-t5', tableNumber: 5, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '09:30', name: 'Sniadanie z joga', guestCount: 6, tableId: 'vg-t4', tableNumber: 4, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '11:00', name: 'Brunch Marta', guestCount: 3, tableId: 'vg-t3', tableNumber: 3, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '12:00', name: 'Lunch Anna', guestCount: 2, tableId: 'vg-t1', tableNumber: 1, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '13:00', name: 'Green team meeting', guestCount: 4, tableId: 'vg-t6', tableNumber: 6, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '15:00', name: 'Deser i kawa', guestCount: 2, tableId: 'vg-t7', tableNumber: 7, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '17:00', name: 'After work bowl', guestCount: 4, tableId: 'vg-t2', tableNumber: 2, status: 'pending' },
    { dayOffset: 0, bookingTime: '18:30', name: 'Kolacja vegan date', guestCount: 2, tableId: 'vg-t5', tableNumber: 5, status: 'confirmed' },
    { dayOffset: 1, bookingTime: '11:00', name: 'Spotkanie book club', guestCount: 4, tableId: 'vg-t6', tableNumber: 6, status: 'confirmed' },
    { dayOffset: 2, bookingTime: '09:00', name: 'Warsztaty smoothie', guestCount: 6, tableId: 'vg-t4', tableNumber: 4, status: 'pending' },
  ],
  shifts: [
    { role: 'manager', displayName: 'Jakub Zmianowicz', startHour: 7, endHour: 15 },
    { role: 'chef', displayName: 'Natalia Sous-Chef', startHour: 6, endHour: 14 },
    { role: 'waiter', displayName: 'Konrad Obslugowicz', startHour: 7, endHour: 15 },
    { role: 'waiter', displayName: 'Alicja Serwisowa', startHour: 12, endHour: 20 },
  ],
  todoTasks: [
    { title: 'Przygotuj smoothie mix na rano', assignedToRoles: ['chef'], isGroupTask: false, priority: 'high', category: 'setup' },
    { title: 'Sprawdź dostawy eko warzyw', assignedToRoles: ['chef', 'manager'], isGroupTask: false, priority: 'high', category: 'general' },
  ],
  ingredients: [],
  recipes: [],
};

// ── Bydgoszcz – Brewery Pub ────────────────────────────────────────────────────
const breweryPubRestaurant: SeedRestaurantData = {
  restaurant: {
    id: 'gastroo-bydgoszcz-pub',
    name: 'Browar Bydgoski',
    address: { street: 'ul. Długa 42', city: 'Bydgoszcz', postalCode: '85-034', country: 'Poland' },
    phone: '+48 52 666 77 88',
    timezone: 'Europe/Warsaw',
    location: { lat: 53.1235, lng: 18.0084 },
    tableCount: 10,
    tags: ['brewery', 'pub', 'craft beer'],
    gbpAttributes: { petFriendly: false, lgbtFriendly: true, veganOptions: true, outdoorSeating: true, familyFriendly: false },
    settings: { currency: 'PLN', language: 'pl', bookingDuration: 120, depositAmount: 0 },
  },
  sections: [
    { id: 'bp-pub', name: 'Pub', color: '#d97706', order: 0 },
    { id: 'bp-garden', name: 'Ogródek piwny', color: '#65a30d', order: 1 },
  ],
  tables: [
    { id: 'bp-t1', number: 1, capacity: 4, shape: 'square', posX: 12, posY: 20, status: 'free', sectionId: 'bp-pub' },
    { id: 'bp-t2', number: 2, capacity: 4, shape: 'square', posX: 34, posY: 20, status: 'occupied', sectionId: 'bp-pub' },
    { id: 'bp-t3', number: 3, capacity: 6, shape: 'rectangle', posX: 58, posY: 20, status: 'free', sectionId: 'bp-pub' },
    { id: 'bp-t4', number: 4, capacity: 2, shape: 'round', posX: 82, posY: 20, status: 'free', sectionId: 'bp-pub' },
    { id: 'bp-t5', number: 5, capacity: 8, shape: 'rectangle', posX: 25, posY: 50, status: 'reserved', sectionId: 'bp-pub' },
    { id: 'bp-t6', number: 6, capacity: 4, shape: 'square', posX: 12, posY: 78, status: 'free', sectionId: 'bp-garden' },
    { id: 'bp-t7', number: 7, capacity: 6, shape: 'rectangle', posX: 36, posY: 78, status: 'free', sectionId: 'bp-garden' },
    { id: 'bp-t8', number: 8, capacity: 4, shape: 'square', posX: 58, posY: 78, status: 'free', sectionId: 'bp-garden' },
    { id: 'bp-t9', number: 9, capacity: 2, shape: 'round', posX: 78, posY: 78, status: 'free', sectionId: 'bp-garden' },
    { id: 'bp-t10', number: 10, capacity: 10, shape: 'rectangle', posX: 65, posY: 50, status: 'free', sectionId: 'bp-pub' },
  ],
  menuCategories: [
    { name: 'Piwa kraftowe (0.5L)', order: 1, items: [
      { name: 'Bydgoskie Pils', price: 16, description: 'Jasny lager, 5.0%', available: true },
      { name: 'Wisła IPA', price: 18, description: 'India Pale Ale, 6.2%, cytrusowy', available: true },
      { name: 'Stary Młyn Porter', price: 20, description: 'Baltic Porter, 8.0%, czekoladowy', available: true },
      { name: 'Pszeniczny Hefeweizen', price: 17, description: 'Piwo pszeniczne, 5.4%', available: true, allergens: ['gluten'] },
      { name: 'Kujawska Saison', price: 19, description: 'Farmhouse ale, 6.8%, przyprawowy', available: true },
    ]},
    { name: 'Dania do piwa', order: 2, items: [
      { name: 'Żeberka BBQ', price: 48, description: '500g, sosem piwnym, coleslaw', available: true },
      { name: 'Fish & Chips', price: 36, description: 'Dorsz w cieście piwnym, frytki', available: true, allergens: ['gluten', 'fish'] },
      { name: 'Nachos loaded', price: 28, description: 'Guacamole, salsa, jalapeño, ser', available: true, allergens: ['milk'] },
      { name: 'Wings 12 szt.', price: 32, description: 'Wybór sosu: BBQ / Buffalo / Honey mustard', available: true },
      { name: 'Kiełbaski rzemieślnicze', price: 34, description: '3 szt., musztarda, ogórki', available: true },
    ]},
    { name: 'Burgery', order: 3, items: [
      { name: 'Browarowy Smash', price: 32, description: 'Podwójny, cheddar, sos piwny, bułka brioche', available: true, allergens: ['gluten', 'milk'] },
      { name: 'Pulled Pork Burger', price: 36, description: 'Szarpana wieprzowina, coleslaw', available: true, allergens: ['gluten'] },
    ]},
    { name: 'Na zimno', order: 4, items: [
      { name: 'Lemoniada grejpfrutowa', price: 12, description: '0.4L', available: true },
      { name: 'Szarlotka bezalkoholowa', price: 14, description: 'Piwo jabłkowe 0.0%, 0.5L', available: true },
    ]},
  ],
  bookings: [
    { dayOffset: -1, bookingTime: '17:00', name: 'After work piwo', guestCount: 6, tableId: 'bp-t3', tableNumber: 3, status: 'confirmed' },
    { dayOffset: -1, bookingTime: '20:00', name: 'Pub quiz team', guestCount: 8, tableId: 'bp-t5', tableNumber: 5, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '14:00', name: 'Obiad z piwem', guestCount: 4, tableId: 'bp-t1', tableNumber: 1, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '15:00', name: 'Happy hour ekipa', guestCount: 6, tableId: 'bp-t3', tableNumber: 3, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '16:30', name: 'Tasting IPA', guestCount: 4, tableId: 'bp-t6', tableNumber: 6, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '17:30', name: 'Piateczek', guestCount: 8, tableId: 'bp-t5', tableNumber: 5, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '18:00', name: 'Degustacja piwna', guestCount: 8, tableId: 'bp-t5', tableNumber: 5, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '19:00', name: 'BBQ na ogrodku', guestCount: 6, tableId: 'bp-t7', tableNumber: 7, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '19:30', name: 'Piatekowe spotkanie', guestCount: 6, tableId: 'bp-t7', tableNumber: 7, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '20:00', name: 'Urodziny Kuby', guestCount: 4, tableId: 'bp-t8', tableNumber: 8, status: 'pending' },
    { dayOffset: 1, bookingTime: '16:00', name: 'Urodziny Marka', guestCount: 8, tableId: 'bp-t5', tableNumber: 5, status: 'confirmed' },
    { dayOffset: 2, bookingTime: '17:00', name: 'Liga pubquiz', guestCount: 6, tableId: 'bp-t3', tableNumber: 3, status: 'pending' },
  ],
  shifts: [
    { role: 'manager', displayName: 'Damian Organizator', startHour: 14, endHour: 1 },
    { role: 'bartender', displayName: 'Ola Barmanka', startHour: 14, endHour: 2 },
    { role: 'bartender', displayName: 'Wojciech Mixolog', startHour: 18, endHour: 2 },
    { role: 'chef', displayName: 'Lukasz Pizzaiolo', startHour: 14, endHour: 23 },
    { role: 'waiter', displayName: 'Zofia Kelnerka', startHour: 14, endHour: 23 },
  ],
  todoTasks: [
    { title: 'Sprawdź ciśnienie CO2 w beczkach', assignedToRoles: ['bartender'], isGroupTask: false, priority: 'high', category: 'setup' },
    { title: 'Przygotuj quiz na wieczór', assignedToRoles: ['manager'], isGroupTask: false, priority: 'medium', category: 'general' },
    { title: 'Zamknij ogródek (jeśli deszcz)', assignedToRoles: ['waiter', 'manager'], isGroupTask: true, priority: 'medium', category: 'general' },
  ],
  ingredients: [],
  recipes: [],
};

// ── Białystok – Georgian Restaurant ────────────────────────────────────────────
const georgianRestaurant: SeedRestaurantData = {
  restaurant: {
    id: 'gastroo-bialystok-georgian',
    name: 'Chaczapuri House Białystok',
    address: { street: 'ul. Lipowa 19', city: 'Białystok', postalCode: '15-427', country: 'Poland' },
    phone: '+48 85 777 88 99',
    timezone: 'Europe/Warsaw',
    location: { lat: 53.1325, lng: 23.1688 },
    tableCount: 8,
    tags: ['georgian', 'khachapuri', 'wine'],
    gbpAttributes: { petFriendly: false, lgbtFriendly: true, veganOptions: true, outdoorSeating: false, familyFriendly: true },
    settings: { currency: 'PLN', language: 'pl', bookingDuration: 90, depositAmount: 20 },
  },
  sections: [
    { id: 'ge-main', name: 'Sala główna', color: '#b91c1c', order: 0 },
    { id: 'ge-private', name: 'Sala prywatna', color: '#7e22ce', order: 1 },
  ],
  tables: [
    { id: 'ge-t1', number: 1, capacity: 2, shape: 'round', posX: 15, posY: 20, status: 'free', sectionId: 'ge-main' },
    { id: 'ge-t2', number: 2, capacity: 4, shape: 'square', posX: 38, posY: 20, status: 'free', sectionId: 'ge-main' },
    { id: 'ge-t3', number: 3, capacity: 4, shape: 'square', posX: 62, posY: 20, status: 'occupied', sectionId: 'ge-main' },
    { id: 'ge-t4', number: 4, capacity: 2, shape: 'round', posX: 85, posY: 20, status: 'free', sectionId: 'ge-main' },
    { id: 'ge-t5', number: 5, capacity: 6, shape: 'rectangle', posX: 30, posY: 55, status: 'free', sectionId: 'ge-main' },
    { id: 'ge-t6', number: 6, capacity: 4, shape: 'square', posX: 70, posY: 55, status: 'reserved', sectionId: 'ge-main' },
    { id: 'ge-t7', number: 7, capacity: 8, shape: 'rectangle', posX: 30, posY: 82, status: 'free', sectionId: 'ge-private' },
    { id: 'ge-t8', number: 8, capacity: 10, shape: 'rectangle', posX: 70, posY: 82, status: 'free', sectionId: 'ge-private' },
  ],
  menuCategories: [
    { name: 'Chaczapuri', order: 1, items: [
      { name: 'Chaczapuri adżarskie', price: 34, description: 'Z jajkiem i masłem, ser sulguni', available: true, allergens: ['gluten', 'milk', 'eggs'] },
      { name: 'Chaczapuri imeruli', price: 28, description: 'Okrągłe, z serem', available: true, allergens: ['gluten', 'milk'] },
      { name: 'Chaczapuri megruli', price: 32, description: 'Podwójny ser, wierzch zapiekany', available: true, allergens: ['gluten', 'milk'] },
      { name: 'Lobiani', price: 26, description: 'Nadzienie fasolowe, ziołowe', available: true, allergens: ['gluten'], vegetarian: true },
    ]},
    { name: 'Chinkali & dania ciepłe', order: 2, items: [
      { name: 'Chinkali z mięsem (5 szt.)', price: 28, description: 'Gotowane pierożki z jagnięciną', available: true, allergens: ['gluten'] },
      { name: 'Chinkali z serem (5 szt.)', price: 26, description: 'Z sulguni i ziołami', available: true, allergens: ['gluten', 'milk'], vegetarian: true },
      { name: 'Szaszłyk jagnięcy', price: 42, description: 'Grillowany, z warzywami, tkemali', available: true },
      { name: 'Czachochbili', price: 36, description: 'Gulasz z kurczaka z ziołami gruzińskimi', available: true },
    ]},
    { name: 'Przystawki', order: 3, items: [
      { name: 'Badridżani', price: 18, description: 'Bakłażan z pastą orzechową', available: true, allergens: ['tree-nuts'], vegan: true },
      { name: 'Pchali mix', price: 22, description: 'Pasty z warzyw, orzech włoski', available: true, allergens: ['tree-nuts'], vegan: true },
      { name: 'Sałatka gruzińska', price: 16, description: 'Pomidory, ogórki, cebula, orzechy, koriander', available: true, vegan: true },
    ]},
    { name: 'Wina gruzińskie', order: 4, items: [
      { name: 'Saperavi', price: 26, description: 'Kieliszek 150ml, wino czerwone, kwevri', available: true },
      { name: 'Rkatsiteli', price: 24, description: 'Kieliszek 150ml, wino bursztynowe', available: true },
      { name: 'Kindzmarauli', price: 28, description: 'Kieliszek 150ml, półsłodkie czerwone', available: true },
    ]},
  ],
  bookings: [
    { dayOffset: -1, bookingTime: '13:00', name: 'Lunch gruzinski', guestCount: 4, tableId: 'ge-t2', tableNumber: 2, status: 'confirmed' },
    { dayOffset: -1, bookingTime: '19:00', name: 'Kolacja supra', guestCount: 8, tableId: 'ge-t7', tableNumber: 7, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '12:00', name: 'Chinkali lunch', guestCount: 3, tableId: 'ge-t3', tableNumber: 3, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '13:00', name: 'Lunch Kowalska', guestCount: 2, tableId: 'ge-t1', tableNumber: 1, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '14:00', name: 'Grupa turystow', guestCount: 6, tableId: 'ge-t5', tableNumber: 5, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '17:00', name: 'After work chaczapuri', guestCount: 4, tableId: 'ge-t6', tableNumber: 6, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '18:30', name: 'Gruzinska uczta', guestCount: 8, tableId: 'ge-t7', tableNumber: 7, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '19:00', name: 'Chaczapuri Night', guestCount: 4, tableId: 'ge-t2', tableNumber: 2, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '19:30', name: 'Wieczor z chacha', guestCount: 2, tableId: 'ge-t4', tableNumber: 4, status: 'pending' },
    { dayOffset: 0, bookingTime: '20:00', name: 'Impreza firmowa', guestCount: 10, tableId: 'ge-t8', tableNumber: 8, status: 'confirmed' },
    { dayOffset: 1, bookingTime: '18:00', name: 'Kolacja rodzinna', guestCount: 6, tableId: 'ge-t5', tableNumber: 5, status: 'confirmed' },
    { dayOffset: 2, bookingTime: '13:00', name: 'Spotkanie biznesowe', guestCount: 4, tableId: 'ge-t2', tableNumber: 2, status: 'pending' },
  ],
  shifts: [
    { role: 'manager', displayName: 'Martyna Salowa', startHour: 11, endHour: 21 },
    { role: 'chef', displayName: 'Grzegorz Sushimaster', startHour: 10, endHour: 22 },
    { role: 'waiter', displayName: 'Alicja Serwisowa', startHour: 11, endHour: 21 },
    { role: 'waiter', displayName: 'Konrad Obslugowicz', startHour: 16, endHour: 23 },
  ],
  todoTasks: [
    { title: 'Przygotuj ciasto na chaczapuri', assignedToRoles: ['chef'], isGroupTask: false, priority: 'high', category: 'setup' },
    { title: 'Sprawdź zapas wina gruzińskiego', assignedToRoles: ['manager'], isGroupTask: false, priority: 'medium', category: 'general' },
  ],
  ingredients: [],
  recipes: [],
};

// ── Toruń – Pierogi House ──────────────────────────────────────────────────────
const pierogiRestaurant: SeedRestaurantData = {
  restaurant: {
    id: 'gastroo-torun-pierogi',
    name: 'Pierogarnia Kopernik Toruń',
    address: { street: 'ul. Szeroka 8', city: 'Toruń', postalCode: '87-100', country: 'Poland' },
    phone: '+48 56 111 22 33',
    timezone: 'Europe/Warsaw',
    location: { lat: 53.0099, lng: 18.6047 },
    tableCount: 8,
    tags: ['pierogi', 'traditional', 'polish'],
    gbpAttributes: { petFriendly: false, lgbtFriendly: true, veganOptions: true, outdoorSeating: true, familyFriendly: true },
    settings: { currency: 'PLN', language: 'pl', bookingDuration: 75, depositAmount: 0 },
  },
  sections: [
    { id: 'pg-sala', name: 'Sala', color: '#ea580c', order: 0 },
    { id: 'pg-rynek', name: 'Stoliki rynek', color: '#0284c7', order: 1 },
  ],
  tables: [
    { id: 'pg-t1', number: 1, capacity: 2, shape: 'round', posX: 15, posY: 22, status: 'free', sectionId: 'pg-sala' },
    { id: 'pg-t2', number: 2, capacity: 4, shape: 'square', posX: 38, posY: 22, status: 'free', sectionId: 'pg-sala' },
    { id: 'pg-t3', number: 3, capacity: 4, shape: 'square', posX: 62, posY: 22, status: 'occupied', sectionId: 'pg-sala' },
    { id: 'pg-t4', number: 4, capacity: 6, shape: 'rectangle', posX: 38, posY: 50, status: 'free', sectionId: 'pg-sala' },
    { id: 'pg-t5', number: 5, capacity: 8, shape: 'rectangle', posX: 38, posY: 75, status: 'reserved', sectionId: 'pg-sala' },
    { id: 'pg-t6', number: 6, capacity: 2, shape: 'round', posX: 15, posY: 78, status: 'free', sectionId: 'pg-rynek' },
    { id: 'pg-t7', number: 7, capacity: 4, shape: 'square', posX: 65, posY: 78, status: 'free', sectionId: 'pg-rynek' },
    { id: 'pg-t8', number: 8, capacity: 2, shape: 'round', posX: 85, posY: 78, status: 'free', sectionId: 'pg-rynek' },
  ],
  menuCategories: [
    { name: 'Pierogi tradycyjne', order: 1, items: [
      { name: 'Pierogi ruskie (12 szt.)', price: 24, description: 'Ziemniak, twaróg, smażona cebulka', available: true, allergens: ['gluten', 'milk'], vegetarian: true },
      { name: 'Pierogi z mięsem (12 szt.)', price: 26, description: 'Wieprzowina, cebula, pieprz', available: true, allergens: ['gluten'] },
      { name: 'Pierogi z kapustą i grzybami (12 szt.)', price: 24, description: 'Kiszona kapusta, grzyby leśne', available: true, allergens: ['gluten'], vegan: true },
      { name: 'Pierogi ze szpinakiem i fetą (12 szt.)', price: 26, description: 'Szpinak, feta, orzeszki piniowe', available: true, allergens: ['gluten', 'milk', 'tree-nuts'], vegetarian: true },
    ]},
    { name: 'Pierogi autorskie', order: 2, items: [
      { name: 'Pierogi kacze (10 szt.)', price: 34, description: 'Confit z kaczki, żurawina, tymianek', available: true, allergens: ['gluten'] },
      { name: 'Pierogi truflowe (10 szt.)', price: 38, description: 'Ziemniak, trufa, mascarpone', available: true, allergens: ['gluten', 'milk'] },
      { name: 'Pierogi z łososiem (10 szt.)', price: 32, description: 'Łosoś wędzony, koperek, krem chrzanowy', available: true, allergens: ['gluten', 'fish', 'milk'] },
    ]},
    { name: 'Zupy', order: 3, items: [
      { name: 'Barszcz czerwony', price: 14, description: 'Z uszkiem', available: true, allergens: ['gluten'] },
      { name: 'Żurek', price: 18, description: 'Z jajkiem i kiełbasą', available: true, allergens: ['gluten', 'eggs'] },
      { name: 'Rosół babci', price: 16, description: 'Z makaronem, złocisty', available: true, allergens: ['gluten'] },
    ]},
    { name: 'Napoje', order: 4, items: [
      { name: 'Kompot z rabarbar', price: 10, description: 'Domowy, 0.3L', available: true },
      { name: 'Piwo lokalne Toruńskie', price: 14, description: 'Jasne, 0.5L', available: true },
      { name: 'Herbata z miodem', price: 10, description: 'Czarna, z miodem lipowym', available: true },
    ]},
  ],
  bookings: [
    { dayOffset: -1, bookingTime: '12:00', name: 'Szkolna wycieczka z Krakowa', guestCount: 8, tableId: 'pg-t5', tableNumber: 5, status: 'confirmed' },
    { dayOffset: -1, bookingTime: '18:00', name: 'Wieczor pierogowy', guestCount: 4, tableId: 'pg-t7', tableNumber: 7, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '11:00', name: 'Turysci z Berlina', guestCount: 4, tableId: 'pg-t7', tableNumber: 7, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '12:00', name: 'Lunch rodzinny', guestCount: 6, tableId: 'pg-t4', tableNumber: 4, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '12:30', name: 'Wycieczka szkolna', guestCount: 8, tableId: 'pg-t5', tableNumber: 5, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '13:30', name: 'Para z Warszawy', guestCount: 2, tableId: 'pg-t1', tableNumber: 1, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '15:00', name: 'Podwieczorek babci', guestCount: 4, tableId: 'pg-t2', tableNumber: 2, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '17:00', name: 'After work pierogi', guestCount: 3, tableId: 'pg-t3', tableNumber: 3, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '18:00', name: 'Degustacja pierogow', guestCount: 6, tableId: 'pg-t4', tableNumber: 4, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '19:00', name: 'Kolacja rodzinna', guestCount: 4, tableId: 'pg-t2', tableNumber: 2, status: 'pending' },
    { dayOffset: 1, bookingTime: '13:00', name: 'Turysci z Niemiec', guestCount: 4, tableId: 'pg-t7', tableNumber: 7, status: 'confirmed' },
    { dayOffset: 2, bookingTime: '19:00', name: 'Impreza tematyczna', guestCount: 8, tableId: 'pg-t5', tableNumber: 5, status: 'pending' },
  ],
  shifts: [
    { role: 'manager', displayName: 'Jakub Zmianowicz', startHour: 10, endHour: 18 },
    { role: 'chef', displayName: 'Natalia Sous-Chef', startHour: 8, endHour: 16 },
    { role: 'chef', displayName: 'Lukasz Pizzaiolo', startHour: 14, endHour: 22 },
    { role: 'waiter', displayName: 'Zofia Kelnerka', startHour: 10, endHour: 18 },
    { role: 'waiter', displayName: 'Alicja Serwisowa', startHour: 14, endHour: 22 },
  ],
  todoTasks: [
    { title: 'Przygotuj farsz na dzień', assignedToRoles: ['chef'], isGroupTask: false, priority: 'high', category: 'setup' },
    { title: 'Lepienie pierogów – plan na wieczór', assignedToRoles: ['chef'], isGroupTask: true, priority: 'high', category: 'setup' },
    { title: 'Zamówienie mąki i twarogu', assignedToRoles: ['manager'], isGroupTask: false, priority: 'medium', category: 'general' },
  ],
  ingredients: [],
  recipes: [],
};

// ── Rzeszów – Mediterranean Grill ──────────────────────────────────────────────
const medGrillRestaurant: SeedRestaurantData = {
  restaurant: {
    id: 'gastroo-rzeszow-grill',
    name: 'Olea Mediterranean Grill',
    address: { street: 'ul. 3 Maja 22', city: 'Rzeszów', postalCode: '35-030', country: 'Poland' },
    phone: '+48 17 888 99 00',
    timezone: 'Europe/Warsaw',
    location: { lat: 50.0412, lng: 21.9991 },
    tableCount: 8,
    tags: ['mediterranean', 'grill', 'greek'],
    gbpAttributes: { petFriendly: true, lgbtFriendly: true, veganOptions: true, outdoorSeating: true, familyFriendly: true },
    settings: { currency: 'PLN', language: 'pl', bookingDuration: 90, depositAmount: 20 },
  },
  sections: [
    { id: 'md-sala', name: 'Sala', color: '#0369a1', order: 0 },
    { id: 'md-taras', name: 'Taras', color: '#ea580c', order: 1 },
  ],
  tables: [
    { id: 'md-t1', number: 1, capacity: 2, shape: 'round', posX: 15, posY: 25, status: 'free', sectionId: 'md-sala' },
    { id: 'md-t2', number: 2, capacity: 4, shape: 'square', posX: 40, posY: 25, status: 'free', sectionId: 'md-sala' },
    { id: 'md-t3', number: 3, capacity: 4, shape: 'square', posX: 65, posY: 25, status: 'occupied', sectionId: 'md-sala' },
    { id: 'md-t4', number: 4, capacity: 6, shape: 'rectangle', posX: 40, posY: 52, status: 'free', sectionId: 'md-sala' },
    { id: 'md-t5', number: 5, capacity: 2, shape: 'round', posX: 15, posY: 78, status: 'free', sectionId: 'md-taras' },
    { id: 'md-t6', number: 6, capacity: 4, shape: 'square', posX: 38, posY: 78, status: 'reserved', sectionId: 'md-taras' },
    { id: 'md-t7', number: 7, capacity: 4, shape: 'square', posX: 62, posY: 78, status: 'free', sectionId: 'md-taras' },
    { id: 'md-t8', number: 8, capacity: 2, shape: 'round', posX: 85, posY: 78, status: 'free', sectionId: 'md-taras' },
  ],
  menuCategories: [
    { name: 'Mezze', order: 1, items: [
      { name: 'Hummus klasyczny', price: 18, description: 'Ciecierzyca, tahini, oliwa, paprika', available: true, vegan: true, allergens: ['sesame'] },
      { name: 'Tzatziki', price: 16, description: 'Jogurt grecki, ogórek, czosnek', available: true, allergens: ['milk'], vegetarian: true },
      { name: 'Falafel (6 szt.)', price: 22, description: 'Ciecierzyca, kolendra, sos tahini', available: true, vegan: true, allergens: ['sesame'] },
      { name: 'Halloumi grillowane', price: 26, description: 'Z miodem i miętą', available: true, allergens: ['milk'], vegetarian: true },
    ]},
    { name: 'Grill', order: 2, items: [
      { name: 'Souvlaki z kurczaka', price: 34, description: '3 szaszłyki, ryż, sałatka', available: true },
      { name: 'Kofta jagnięca', price: 38, description: 'Mielona jagnięcina, grillowane warzywa', available: true },
      { name: 'Grillowana dorada', price: 46, description: 'Cała ryba, cytryna, ziemniaki', available: true, allergens: ['fish'] },
      { name: 'Mix grill (2 os.)', price: 78, description: 'Jagnięcina, kurczak, kofta, halloumi, warzywa', available: true, allergens: ['milk'] },
    ]},
    { name: 'Sałatki & dania lekkie', order: 3, items: [
      { name: 'Sałatka grecka', price: 24, description: 'Pomidory, ogórek, oliwki, feta, oregano', available: true, allergens: ['milk'], vegetarian: true },
      { name: 'Tabouleh', price: 20, description: 'Kasza bulgur, pietruszka, mięta, pomidory', available: true, vegan: true, allergens: ['gluten'] },
    ]},
    { name: 'Napoje & wina', order: 4, items: [
      { name: 'Ajran', price: 10, description: 'Napój jogurtowy, 0.3L', available: true, allergens: ['milk'] },
      { name: 'Retsina (kieliszek)', price: 22, description: 'Greckie wino żywiczne, 150ml', available: true },
      { name: 'Lemoniada z miętą', price: 12, description: '0.4L', available: true },
    ]},
  ],
  bookings: [
    { dayOffset: -1, bookingTime: '13:00', name: 'Lunch srodziemnomorski', guestCount: 4, tableId: 'md-t2', tableNumber: 2, status: 'confirmed' },
    { dayOffset: -1, bookingTime: '19:00', name: 'Kolacja na tarasie', guestCount: 2, tableId: 'md-t5', tableNumber: 5, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '12:00', name: 'Lunch turystyczny', guestCount: 4, tableId: 'md-t6', tableNumber: 6, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '12:30', name: 'Meze dla dwojga', guestCount: 2, tableId: 'md-t1', tableNumber: 1, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '13:30', name: 'Grupa z biura', guestCount: 6, tableId: 'md-t4', tableNumber: 4, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '17:00', name: 'Happy hour taras', guestCount: 4, tableId: 'md-t7', tableNumber: 7, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '18:00', name: 'Kolacja z winem', guestCount: 2, tableId: 'md-t8', tableNumber: 8, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '18:30', name: 'Kolacja grecka', guestCount: 4, tableId: 'md-t2', tableNumber: 2, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '19:00', name: 'Urodziny Kasi', guestCount: 6, tableId: 'md-t4', tableNumber: 4, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '20:00', name: 'Wieczor tematyczny', guestCount: 4, tableId: 'md-t3', tableNumber: 3, status: 'pending' },
    { dayOffset: 1, bookingTime: '18:00', name: 'Spotkanie rodzinne', guestCount: 6, tableId: 'md-t4', tableNumber: 4, status: 'confirmed' },
    { dayOffset: 2, bookingTime: '13:00', name: 'Lunch z partnerem', guestCount: 2, tableId: 'md-t5', tableNumber: 5, status: 'pending' },
  ],
  shifts: [
    { role: 'manager', displayName: 'Martyna Salowa', startHour: 11, endHour: 21 },
    { role: 'chef', displayName: 'Grzegorz Sushimaster', startHour: 10, endHour: 22 },
    { role: 'waiter', displayName: 'Konrad Obslugowicz', startHour: 11, endHour: 21 },
    { role: 'bartender', displayName: 'Ola Barmanka', startHour: 16, endHour: 23 },
  ],
  todoTasks: [
    { title: 'Przygotuj marynaty na grilla', assignedToRoles: ['chef'], isGroupTask: false, priority: 'high', category: 'setup' },
    { title: 'Sprawdź zapas oliwek i fety', assignedToRoles: ['chef', 'manager'], isGroupTask: false, priority: 'medium', category: 'general' },
  ],
  ingredients: [],
  recipes: [],
};

// ── Opole – Coffee & Brunch ────────────────────────────────────────────────────
const brunchRestaurant: SeedRestaurantData = {
  restaurant: {
    id: 'gastroo-opole-brunch',
    name: 'Morning Glory Opole',
    address: { street: 'ul. Krakowska 12', city: 'Opole', postalCode: '45-018', country: 'Poland' },
    phone: '+48 77 222 33 44',
    timezone: 'Europe/Warsaw',
    location: { lat: 50.6751, lng: 17.9213 },
    tableCount: 6,
    tags: ['brunch', 'coffee', 'specialty'],
    gbpAttributes: { petFriendly: true, lgbtFriendly: true, veganOptions: true, outdoorSeating: true, familyFriendly: true },
    settings: { currency: 'PLN', language: 'pl', bookingDuration: 60, depositAmount: 0 },
  },
  sections: [
    { id: 'br-main', name: 'Sala', color: '#ca8a04', order: 0 },
    { id: 'br-balkon', name: 'Balkon', color: '#16a34a', order: 1 },
  ],
  tables: [
    { id: 'br-t1', number: 1, capacity: 2, shape: 'round', posX: 18, posY: 25, status: 'free', sectionId: 'br-main' },
    { id: 'br-t2', number: 2, capacity: 4, shape: 'square', posX: 42, posY: 25, status: 'occupied', sectionId: 'br-main' },
    { id: 'br-t3', number: 3, capacity: 4, shape: 'square', posX: 68, posY: 25, status: 'free', sectionId: 'br-main' },
    { id: 'br-t4', number: 4, capacity: 6, shape: 'rectangle', posX: 42, posY: 55, status: 'free', sectionId: 'br-main' },
    { id: 'br-t5', number: 5, capacity: 2, shape: 'round', posX: 30, posY: 80, status: 'reserved', sectionId: 'br-balkon' },
    { id: 'br-t6', number: 6, capacity: 2, shape: 'round', posX: 62, posY: 80, status: 'free', sectionId: 'br-balkon' },
  ],
  menuCategories: [
    { name: 'Brunch', order: 1, items: [
      { name: 'Eggs Benedict', price: 28, description: 'Jajko pocz., szynka, sos holenderski, muffin', available: true, allergens: ['gluten', 'eggs', 'milk'] },
      { name: 'Pancakes z borówkami', price: 24, description: 'Syrop klonowy, mascarpone', available: true, allergens: ['gluten', 'milk', 'eggs'] },
      { name: 'Shakshuka', price: 26, description: 'Jajka w sosie pomidorowym, feta, pieczywo', available: true, allergens: ['eggs', 'milk', 'gluten'] },
      { name: 'Croissant z łososiem', price: 30, description: 'Łosoś wędzony, awokado, krem chrzanowy', available: true, allergens: ['gluten', 'fish', 'milk'] },
      { name: 'Granola bowl', price: 22, description: 'Jogurt grecki, granola, owoce sezonowe', available: true, allergens: ['milk', 'tree-nuts'] },
    ]},
    { name: 'Kawy specialty', order: 2, items: [
      { name: 'Espresso', price: 10, description: 'Single shot, specialty beans', available: true },
      { name: 'Flat White', price: 16, description: 'Double shot, mleko pełne', available: true, allergens: ['milk'] },
      { name: 'Pour Over V60', price: 18, description: 'Kawa filtrowana, single origin', available: true },
      { name: 'Cold Brew', price: 16, description: '24h extraction, 350ml', available: true },
      { name: 'Matcha Latte', price: 18, description: 'Na mleku owsianym', available: true },
    ]},
    { name: 'Lekkie lunche', order: 3, items: [
      { name: 'Avocado toast', price: 24, description: 'Chleb na zakwasie, awokado, jajko', available: true, allergens: ['gluten', 'eggs'] },
      { name: 'Sałatka z kozim serem', price: 28, description: 'Burak, orzech włoski, miodowy dressing', available: true, allergens: ['milk', 'tree-nuts'] },
    ]},
    { name: 'Ciasta', order: 4, items: [
      { name: 'Sernik baskijski', price: 18, description: 'Kremowy, spalony wierzch', available: true, allergens: ['milk', 'eggs', 'gluten'] },
      { name: 'Ciasto cytrynowe', price: 16, description: 'Z bezą', available: true, allergens: ['eggs', 'gluten'] },
    ]},
  ],
  bookings: [
    { dayOffset: -1, bookingTime: '08:00', name: 'Poranne spotkanie CEO', guestCount: 2, tableId: 'br-t1', tableNumber: 1, status: 'confirmed' },
    { dayOffset: -1, bookingTime: '10:00', name: 'Brunch team HR', guestCount: 4, tableId: 'br-t3', tableNumber: 3, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '07:30', name: 'Early bird sniadanie', guestCount: 2, tableId: 'br-t1', tableNumber: 1, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '08:30', name: 'Spotkanie przed praca', guestCount: 2, tableId: 'br-t5', tableNumber: 5, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '09:00', name: 'Brunch firmowy', guestCount: 6, tableId: 'br-t4', tableNumber: 4, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '09:30', name: 'Jajka benedykt para', guestCount: 2, tableId: 'br-t6', tableNumber: 6, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '10:00', name: 'Rodzinne sniadanie', guestCount: 4, tableId: 'br-t3', tableNumber: 3, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '10:30', name: 'Sniadanie z przyjaciolka', guestCount: 2, tableId: 'br-t5', tableNumber: 5, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '11:00', name: 'Late brunch grupa', guestCount: 6, tableId: 'br-t4', tableNumber: 4, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '12:00', name: 'Lunch lekki', guestCount: 3, tableId: 'br-t2', tableNumber: 2, status: 'pending' },
    { dayOffset: 1, bookingTime: '09:00', name: 'Brunch urodzinowy', guestCount: 4, tableId: 'br-t3', tableNumber: 3, status: 'confirmed' },
    { dayOffset: 2, bookingTime: '11:00', name: 'Baby shower brunch', guestCount: 4, tableId: 'br-t3', tableNumber: 3, status: 'pending' },
  ],
  shifts: [
    { role: 'manager', displayName: 'Damian Organizator', startHour: 6, endHour: 14 },
    { role: 'chef', displayName: 'Natalia Sous-Chef', startHour: 5, endHour: 13 },
    { role: 'waiter', displayName: 'Zofia Kelnerka', startHour: 6, endHour: 14 },
    { role: 'bartender', displayName: 'Ola Barmanka', startHour: 6, endHour: 14 },
  ],
  todoTasks: [
    { title: 'Przygotuj ciasta na dzień', assignedToRoles: ['chef'], isGroupTask: false, priority: 'high', category: 'setup' },
    { title: 'Kalibracja młynka do kawy', assignedToRoles: ['bartender'], isGroupTask: false, priority: 'high', category: 'setup' },
  ],
  ingredients: [],
  recipes: [],
};

// ── Kielce – Ramen Bar ─────────────────────────────────────────────────────────
const ramenBarRestaurant: SeedRestaurantData = {
  restaurant: {
    id: 'gastroo-kielce-ramen',
    name: 'Tonkotsu Ramen Kielce',
    address: { street: 'ul. Sienkiewicza 7', city: 'Kielce', postalCode: '25-007', country: 'Poland' },
    phone: '+48 41 333 44 55',
    timezone: 'Europe/Warsaw',
    location: { lat: 50.8661, lng: 20.6286 },
    tableCount: 6,
    tags: ['ramen', 'japanese', 'noodles'],
    gbpAttributes: { petFriendly: false, lgbtFriendly: true, veganOptions: true, outdoorSeating: false, familyFriendly: true },
    settings: { currency: 'PLN', language: 'pl', bookingDuration: 60, depositAmount: 0 },
  },
  sections: [
    { id: 'rm-bar', name: 'Bar', color: '#dc2626', order: 0 },
    { id: 'rm-sala', name: 'Sala', color: '#0ea5e9', order: 1 },
  ],
  tables: [
    { id: 'rm-t1', number: 1, capacity: 2, shape: 'round', posX: 12, posY: 20, status: 'free', sectionId: 'rm-bar' },
    { id: 'rm-t2', number: 2, capacity: 2, shape: 'round', posX: 32, posY: 20, status: 'free', sectionId: 'rm-bar' },
    { id: 'rm-t3', number: 3, capacity: 2, shape: 'round', posX: 52, posY: 20, status: 'occupied', sectionId: 'rm-bar' },
    { id: 'rm-t4', number: 4, capacity: 4, shape: 'square', posX: 20, posY: 55, status: 'free', sectionId: 'rm-sala' },
    { id: 'rm-t5', number: 5, capacity: 4, shape: 'square', posX: 50, posY: 55, status: 'reserved', sectionId: 'rm-sala' },
    { id: 'rm-t6', number: 6, capacity: 6, shape: 'rectangle', posX: 35, posY: 82, status: 'free', sectionId: 'rm-sala' },
  ],
  menuCategories: [
    { name: 'Ramen', order: 1, items: [
      { name: 'Tonkotsu Classic', price: 36, description: 'Bulion wieprzowy 12h, chashu, jajko ajitama, nori', available: true, allergens: ['eggs', 'soy', 'gluten'] },
      { name: 'Shoyu Ramen', price: 34, description: 'Bulion sojowy, kurczak, bambus, negi', available: true, allergens: ['soy', 'gluten'] },
      { name: 'Miso Ramen', price: 36, description: 'Pasta miso, wieprzowina, kukurydza, masło', available: true, allergens: ['soy', 'milk', 'gluten'] },
      { name: 'Tantanmen', price: 38, description: 'Pikantny, sezamowy, mielona wieprzowina, bok choy', available: true, allergens: ['soy', 'sesame', 'gluten'] },
      { name: 'Vegan Ramen', price: 32, description: 'Bulion warzywny, tofu, grzyby shiitake, wakame', available: true, vegan: true, allergens: ['soy', 'gluten'] },
    ]},
    { name: 'Przystawki', order: 2, items: [
      { name: 'Gyoza wieprzowe (6 szt.)', price: 22, description: 'Pan-fried, sos ponzu', available: true, allergens: ['gluten', 'soy'] },
      { name: 'Karaage (kurczak)', price: 24, description: 'Japońskie smażone kawałki', available: true, allergens: ['gluten', 'soy'] },
      { name: 'Edamame', price: 14, description: 'Z solą morską', available: true, vegan: true, allergens: ['soy'] },
      { name: 'Bao buns (2 szt.)', price: 20, description: 'Chashu, ogórek marynowany', available: true, allergens: ['gluten'] },
    ]},
    { name: 'Napoje', order: 3, items: [
      { name: 'Piwo japońskie Asahi', price: 16, description: '0.33L', available: true },
      { name: 'Sake ciepłe', price: 22, description: '180ml', available: true },
      { name: 'Calpis', price: 12, description: 'Napój mleczny, 0.3L', available: true, allergens: ['milk'] },
    ]},
  ],
  bookings: [
    { dayOffset: -1, bookingTime: '12:00', name: 'Ramen lunch team', guestCount: 4, tableId: 'rm-t4', tableNumber: 4, status: 'confirmed' },
    { dayOffset: -1, bookingTime: '19:00', name: 'Wieczor japoński', guestCount: 6, tableId: 'rm-t6', tableNumber: 6, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '11:30', name: 'Wczesny lunch ramen', guestCount: 2, tableId: 'rm-t1', tableNumber: 1, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '12:00', name: 'Lunch ramenowy', guestCount: 4, tableId: 'rm-t4', tableNumber: 4, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '12:30', name: 'Miso dla dwojga', guestCount: 2, tableId: 'rm-t2', tableNumber: 2, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '13:00', name: 'Studenci informatyki', guestCount: 6, tableId: 'rm-t6', tableNumber: 6, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '17:00', name: 'Sake happy hour', guestCount: 4, tableId: 'rm-t5', tableNumber: 5, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '18:00', name: 'Tonkotsu wieczor', guestCount: 4, tableId: 'rm-t4', tableNumber: 4, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '18:30', name: 'Randka Sushi Night', guestCount: 2, tableId: 'rm-t1', tableNumber: 1, status: 'confirmed' },
    { dayOffset: 0, bookingTime: '19:30', name: 'Ramen party', guestCount: 6, tableId: 'rm-t6', tableNumber: 6, status: 'pending' },
    { dayOffset: 1, bookingTime: '13:00', name: 'Studenci', guestCount: 6, tableId: 'rm-t6', tableNumber: 6, status: 'confirmed' },
    { dayOffset: 2, bookingTime: '18:00', name: 'Kolacja azjatycka', guestCount: 4, tableId: 'rm-t5', tableNumber: 5, status: 'pending' },
  ],
  shifts: [
    { role: 'manager', displayName: 'Jakub Zmianowicz', startHour: 11, endHour: 21 },
    { role: 'chef', displayName: 'Grzegorz Sushimaster', startHour: 9, endHour: 21 },
    { role: 'waiter', displayName: 'Alicja Serwisowa', startHour: 11, endHour: 21 },
  ],
  todoTasks: [
    { title: 'Sprawdź gotowość bulionu tonkotsu', assignedToRoles: ['chef'], isGroupTask: false, priority: 'high', category: 'setup' },
    { title: 'Przygotuj jajka ajitama', assignedToRoles: ['chef'], isGroupTask: false, priority: 'high', category: 'setup' },
  ],
  ingredients: [],
  recipes: [],
};

const promotions: SeedPromotionDefinition[] = [
  {
    id: 'promo-warsaw-weekly-pasta',
    orgId: 'gastroo-core-org',
    restaurantId: 'gastroo-warszawa-central',
    name: 'Srodowe pasty -15%',
    description: 'Cotygodniowa promocja na wybrane pasty w porze lunchu.',
    type: 'percentage',
    status: 'active',
    priority: 80,
    stackable: false,
    menuItemNames: ['Tagliatelle truflowe', 'Ravioli szpinak-ricotta', 'Penne arrabbiata'],
    schedule: {
      daysOfWeek: [3],
      timeRanges: [{ from: '12:00', to: '16:00' }],
    },
    discountPercentage: 15,
  },
  {
    id: 'promo-gdansk-chef-weekend',
    orgId: 'gastroo-restauracja-org',
    restaurantId: 'gastroo-gdansk-riverside',
    name: 'Weekend Chef Specials -10%',
    description: 'Promocja weekendowa na dania szefa kuchni.',
    type: 'seasonal',
    status: 'active',
    priority: 90,
    stackable: false,
    menuItemNames: ['Sandacz z palonym maslem', 'Kaczka confit'],
    schedule: {
      startDayOffset: 0,
      endDayOffset: 21,
      daysOfWeek: [5, 6, 0],
    },
    discountPercentage: 10,
  },
  {
    id: 'promo-fastfood-happy-hours',
    orgId: 'gastroo-fastfood-org',
    restaurantId: 'gastroo-poznan-express',
    name: 'Happy Hours Burger + Fries',
    description: 'Popoludniowy rabat na burgerowe bestsellery.',
    type: 'happy_hours',
    status: 'active',
    priority: 100,
    stackable: true,
    menuItemNames: ['Classic Burger', 'BBQ Bacon Burger', 'Frytki'],
    schedule: {
      daysOfWeek: [1, 2, 3, 4, 5],
      timeRanges: [{ from: '14:00', to: '17:00' }],
    },
    discountPercentage: 20,
  },
  {
    id: 'promo-pizzeria-evening-slices',
    orgId: 'gastroo-pizzeria-org',
    restaurantId: 'gastroo-wroclaw-pizzeria',
    name: 'Wieczor z pizza premium',
    description: 'Stala promocja wieczorna na pizze premium.',
    type: 'fixed_discount',
    status: 'scheduled',
    priority: 70,
    stackable: false,
    menuItemNames: ['Truffle Bianca', 'Burrata Fresca', 'Quattro Formaggi'],
    schedule: {
      startDayOffset: 1,
      endDayOffset: 30,
      daysOfWeek: [4, 5, 6],
      timeRanges: [{ from: '18:00', to: '22:30' }],
    },
    discountAmount: { amount: 6, currency: 'PLN' },
  },
  // ── Wave 2: promotions for new orgs ────────────────────────────────────────
  {
    id: 'promo-sushi-lunch-set',
    orgId: 'gastroo-sushi-org',
    restaurantId: 'gastroo-lodz-sushi',
    name: 'Lunch Sushi Set -15%',
    description: 'Zestaw lunchowy: dowolne maki + zupa miso w cenie.',
    type: 'percentage',
    status: 'active',
    priority: 85,
    stackable: false,
    menuItemNames: ['California Roll', 'Spicy Tuna Roll', 'Veggie Roll', 'Ramen miso'],
    schedule: {
      daysOfWeek: [1, 2, 3, 4, 5],
      timeRanges: [{ from: '11:30', to: '15:00' }],
    },
    discountPercentage: 15,
  },
  {
    id: 'promo-steak-date-night',
    orgId: 'gastroo-steakhouse-org',
    restaurantId: 'gastroo-katowice-steak',
    name: 'Date Night: Steak for Two -10%',
    description: 'Piątkowa i sobotnia promocja na steki dla dwojga.',
    type: 'percentage',
    status: 'active',
    priority: 90,
    stackable: false,
    menuItemNames: ['Ribeye 300g', 'Filet Mignon 200g', 'T-Bone 500g'],
    schedule: {
      daysOfWeek: [5, 6],
      timeRanges: [{ from: '18:00', to: '22:00' }],
    },
    discountPercentage: 10,
  },
  {
    id: 'promo-wine-wednesday',
    orgId: 'gastroo-winebar-org',
    restaurantId: 'gastroo-szczecin-wine',
    name: 'Wine Wednesday: kieliszek -20%',
    description: 'Środowa promocja na wina kieliszkowe.',
    type: 'percentage',
    status: 'active',
    priority: 80,
    stackable: false,
    categoryNames: ['Wina kieliszek'],
    schedule: {
      daysOfWeek: [3],
      timeRanges: [{ from: '16:00', to: '22:00' }],
    },
    discountPercentage: 20,
  },
  {
    id: 'promo-vegan-morning',
    orgId: 'gastroo-vegan-org',
    restaurantId: 'gastroo-lublin-vegan',
    name: 'Early Bird Śniadanie -5 PLN',
    description: 'Rabat na śniadania do 10:00.',
    type: 'fixed_discount',
    status: 'active',
    priority: 75,
    stackable: false,
    categoryNames: ['Śniadania'],
    schedule: {
      daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
      timeRanges: [{ from: '07:00', to: '10:00' }],
    },
    discountAmount: { amount: 5, currency: 'PLN' },
  },
  {
    id: 'promo-brewery-happy-hour',
    orgId: 'gastroo-brewery-org',
    restaurantId: 'gastroo-bydgoszcz-pub',
    name: 'Craft Beer Happy Hour',
    description: 'Piwa kraftowe taniej w godzinach popołudniowych.',
    type: 'happy_hours',
    status: 'active',
    priority: 95,
    stackable: true,
    menuItemNames: ['Bydgoskie Pils', 'Wisła IPA', 'Pszeniczny Hefeweizen', 'Kujawska Saison'],
    schedule: {
      daysOfWeek: [1, 2, 3, 4, 5],
      timeRanges: [{ from: '15:00', to: '18:00' }],
    },
    discountPercentage: 25,
  },
  {
    id: 'promo-georgian-weekend-feast',
    orgId: 'gastroo-georgian-org',
    restaurantId: 'gastroo-bialystok-georgian',
    name: 'Gruzińska uczta weekendowa',
    description: 'Weekendowy rabat na chaczapuri i chinkali.',
    type: 'seasonal',
    status: 'active',
    priority: 85,
    stackable: false,
    menuItemNames: ['Chaczapuri adżarskie', 'Chaczapuri megruli', 'Chinkali z mięsem (5 szt.)'],
    schedule: {
      startDayOffset: 0,
      endDayOffset: 30,
      daysOfWeek: [5, 6, 0],
    },
    discountPercentage: 10,
  },
  {
    id: 'promo-pierogi-group',
    orgId: 'gastroo-pierogi-org',
    restaurantId: 'gastroo-torun-pierogi',
    name: 'Grupowa degustacja pierogów',
    description: 'Zamów 3+ porcje pierogów i dostań -10%.',
    type: 'bundle',
    status: 'active',
    priority: 80,
    stackable: false,
    categoryNames: ['Pierogi tradycyjne', 'Pierogi autorskie'],
    schedule: {
      daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    },
    discountPercentage: 10,
  },
  {
    id: 'promo-med-grill-lunch',
    orgId: 'gastroo-medgrill-org',
    restaurantId: 'gastroo-rzeszow-grill',
    name: 'Lunch Mediterranean -8 PLN',
    description: 'Rabat na dania z grilla w porze lunchu.',
    type: 'fixed_discount',
    status: 'active',
    priority: 75,
    stackable: false,
    categoryNames: ['Grill'],
    schedule: {
      daysOfWeek: [1, 2, 3, 4, 5],
      timeRanges: [{ from: '12:00', to: '15:00' }],
    },
    discountAmount: { amount: 8, currency: 'PLN' },
  },
  {
    id: 'promo-brunch-weekend',
    orgId: 'gastroo-brunch-org',
    restaurantId: 'gastroo-opole-brunch',
    name: 'Weekend Brunch Special',
    description: 'Weekendowy brunch ze zniżką na ciasta.',
    type: 'percentage',
    status: 'scheduled',
    priority: 70,
    stackable: true,
    categoryNames: ['Ciasta'],
    schedule: {
      startDayOffset: 0,
      endDayOffset: 14,
      daysOfWeek: [6, 0],
      timeRanges: [{ from: '08:00', to: '14:00' }],
    },
    discountPercentage: 15,
  },
  {
    id: 'promo-ramen-student',
    orgId: 'gastroo-ramen-org',
    restaurantId: 'gastroo-kielce-ramen',
    name: 'Studencki Ramen -20%',
    description: 'Promocja studencka na rameny w dni powszednie.',
    type: 'percentage',
    status: 'active',
    priority: 90,
    stackable: false,
    categoryNames: ['Ramen'],
    schedule: {
      daysOfWeek: [1, 2, 3, 4, 5],
      timeRanges: [{ from: '11:00', to: '16:00' }],
    },
    discountPercentage: 20,
  },
];

// ─── Restaurant generator (100+ lokali) ──────────────────────────────────────

interface CuisineTemplate {
  cuisine: string;
  brandNames: string[];
  menuCategories: SeedMenuCategory[];
  tags?: string[];
  bookingDuration?: number;
}

const POLISH_CITIES: Array<{ name: string; lat: number; lng: number }> = [
  { name: 'Warszawa', lat: 52.2297, lng: 21.0122 },
  { name: 'Kraków', lat: 50.0647, lng: 19.9450 },
  { name: 'Gdańsk', lat: 54.3520, lng: 18.6466 },
  { name: 'Wrocław', lat: 51.1079, lng: 17.0385 },
  { name: 'Poznań', lat: 52.4064, lng: 16.9252 },
  { name: 'Łódź', lat: 51.7592, lng: 19.4560 },
  { name: 'Katowice', lat: 50.2649, lng: 19.0238 },
  { name: 'Szczecin', lat: 53.4285, lng: 14.5528 },
  { name: 'Lublin', lat: 51.2465, lng: 22.5684 },
  { name: 'Bydgoszcz', lat: 53.1235, lng: 18.0084 },
  { name: 'Białystok', lat: 53.1325, lng: 23.1688 },
  { name: 'Toruń', lat: 53.0099, lng: 18.6047 },
  { name: 'Rzeszów', lat: 50.0412, lng: 21.9991 },
  { name: 'Opole', lat: 50.6751, lng: 17.9213 },
  { name: 'Kielce', lat: 50.8661, lng: 20.6286 },
  { name: 'Olsztyn', lat: 53.7784, lng: 20.4801 },
  { name: 'Radom', lat: 51.4027, lng: 21.1471 },
  { name: 'Częstochowa', lat: 50.8118, lng: 19.1203 },
  { name: 'Gliwice', lat: 50.2945, lng: 18.6714 },
  { name: 'Sosnowiec', lat: 50.2863, lng: 19.1041 },
  { name: 'Zabrze', lat: 50.3249, lng: 18.7857 },
  { name: 'Bytom', lat: 50.3483, lng: 18.9158 },
  { name: 'Zielona Góra', lat: 51.9356, lng: 15.5062 },
  { name: 'Rybnik', lat: 50.1022, lng: 18.5463 },
  { name: 'Legnica', lat: 51.2070, lng: 16.1619 },
  { name: 'Tarnów', lat: 50.0121, lng: 20.9858 },
  { name: 'Płock', lat: 52.5463, lng: 19.7065 },
  { name: 'Elbląg', lat: 54.1522, lng: 19.4044 },
  { name: 'Nowy Sącz', lat: 49.6250, lng: 20.6915 },
  { name: 'Stalowa Wola', lat: 50.5829, lng: 22.0531 },
];

const CUISINE_TEMPLATES: CuisineTemplate[] = [
  {
    cuisine: 'italian',
    brandNames: ['Trattoria Bella', 'La Cucina', 'Pasta & Vino', 'Il Giardino', 'Dolce Vita'],
    tags: ['italian', 'pasta', 'pizza'],
    menuCategories: [
      { name: 'Antipasti', order: 1, items: [
        { name: 'Bruschetta classica', price: 18, available: true },
        { name: 'Carpaccio di manzo', price: 34, available: true },
        { name: 'Burrata z pomidorami', price: 32, available: true },
      ]},
      { name: 'Pasta', order: 2, items: [
        { name: 'Spaghetti carbonara', price: 36, available: true },
        { name: 'Penne arrabbiata', price: 30, available: true },
        { name: 'Tagliatelle z truflami', price: 48, available: true },
        { name: 'Ravioli ze szpinakiem', price: 38, available: true },
      ]},
      { name: 'Pizza', order: 3, items: [
        { name: 'Margherita', price: 28, available: true },
        { name: 'Quattro Formaggi', price: 38, available: true },
        { name: 'Prosciutto e Rucola', price: 36, available: true },
      ]},
      { name: 'Dolci e Bevande', order: 4, items: [
        { name: 'Tiramisu', price: 22, available: true },
        { name: 'Panna Cotta', price: 20, available: true },
        { name: 'Espresso', price: 10, available: true },
        { name: 'Aperol Spritz', price: 28, available: true },
      ]},
    ],
  },
  {
    cuisine: 'polish',
    brandNames: ['Gospoda Staropolska', 'Polskie Smaki', 'Karczma', 'Pod Lipą', 'Swojska Chata'],
    tags: ['polish', 'traditional', 'pierogi'],
    menuCategories: [
      { name: 'Zupy', order: 1, items: [
        { name: 'Żurek', price: 18, available: true },
        { name: 'Barszcz czerwony', price: 16, available: true },
        { name: 'Rosół z domowym makaronem', price: 20, available: true },
      ]},
      { name: 'Dania główne', order: 2, items: [
        { name: 'Schabowy z ziemniakami', price: 34, available: true },
        { name: 'Gołąbki z sosem pomidorowym', price: 30, available: true },
        { name: 'Pierogi ruskie (12 szt.)', price: 28, available: true },
        { name: 'Kaczka pieczona z jabłkami', price: 52, available: true },
        { name: 'Bigos staropolski', price: 26, available: true },
      ]},
      { name: 'Desery i napoje', order: 3, items: [
        { name: 'Sernik na zimno', price: 18, available: true },
        { name: 'Szarlotka z lodami', price: 20, available: true },
        { name: 'Kompot z jabłek', price: 8, available: true },
        { name: 'Piwo regionalne', price: 14, available: true },
      ]},
    ],
  },
  {
    cuisine: 'asian',
    brandNames: ['Smok i Bambus', 'Asia Fusion', 'Złoty Lotos', 'Kimchi House', 'Tajska Kuchnia'],
    tags: ['asian', 'thai', 'chinese'],
    menuCategories: [
      { name: 'Przystawki', order: 1, items: [
        { name: 'Spring rolls (4 szt.)', price: 18, available: true },
        { name: 'Dim sum mix', price: 28, available: true },
        { name: 'Edamame', price: 14, available: true },
      ]},
      { name: 'Dania główne', order: 2, items: [
        { name: 'Pad Thai z krewetkami', price: 42, available: true },
        { name: 'Curry zielone z tofu', price: 34, available: true },
        { name: 'Kaczka po pekińsku', price: 56, available: true },
        { name: 'Bibimbap', price: 38, available: true },
        { name: 'Tom Yum Kung', price: 32, available: true },
      ]},
      { name: 'Napoje', order: 3, items: [
        { name: 'Bubble tea mango', price: 16, available: true },
        { name: 'Sake ciepłe', price: 22, available: true },
        { name: 'Herbata jaśminowa', price: 10, available: true },
      ]},
    ],
  },
  {
    cuisine: 'burger',
    brandNames: ['Burger Lab', 'Smash Bros', 'Beef Republic', 'Burger Mania', 'Street Burger'],
    tags: ['burger', 'american', 'street-food'],
    menuCategories: [
      { name: 'Burgery', order: 1, items: [
        { name: 'Classic Smash', price: 28, available: true },
        { name: 'Double Cheese', price: 34, available: true },
        { name: 'BBQ Bacon', price: 36, available: true },
        { name: 'Truffle Burger', price: 42, available: true },
        { name: 'Veggie Burger', price: 30, available: true },
      ]},
      { name: 'Sides', order: 2, items: [
        { name: 'Frytki klasyczne', price: 12, available: true },
        { name: 'Frytki z batatów', price: 16, available: true },
        { name: 'Onion Rings', price: 14, available: true },
        { name: 'Coleslaw', price: 10, available: true },
      ]},
      { name: 'Napoje', order: 3, items: [
        { name: 'Craft Cola', price: 10, available: true },
        { name: 'Milkshake wanilia', price: 16, available: true },
        { name: 'Piwo IPA', price: 16, available: true },
      ]},
    ],
  },
  {
    cuisine: 'seafood',
    brandNames: ['Ocean Plate', 'Morska Przystań', 'Rybna', 'Homar & Co', 'Zatoka Smaku'],
    tags: ['seafood', 'fish', 'mediterranean'],
    menuCategories: [
      { name: 'Przystawki morskie', order: 1, items: [
        { name: 'Krewetki w czosnku', price: 36, available: true },
        { name: 'Tatar z łososia', price: 32, available: true },
        { name: 'Małże w białym winie', price: 38, available: true },
      ]},
      { name: 'Dania główne', order: 2, items: [
        { name: 'Dorsz w sosie cytrynowym', price: 48, available: true },
        { name: 'Łosoś grillowany', price: 52, available: true },
        { name: 'Owoce morza talerz', price: 78, available: true },
        { name: 'Fish & Chips', price: 36, available: true },
      ]},
      { name: 'Desery i napoje', order: 3, items: [
        { name: 'Sorbet cytrynowy', price: 16, available: true },
        { name: 'Białe wino kieliszek', price: 24, available: true },
        { name: 'Woda z cytryną', price: 8, available: true },
      ]},
    ],
  },
  {
    cuisine: 'mexican',
    brandNames: ['El Camino', 'Taco Loco', 'Amigos', 'Casa Mexicana', 'Burrito Bros'],
    tags: ['mexican', 'tacos', 'tex-mex'],
    menuCategories: [
      { name: 'Starters', order: 1, items: [
        { name: 'Nachos Supreme', price: 26, available: true },
        { name: 'Guacamole z totopos', price: 22, available: true },
        { name: 'Quesadilla z kurczakiem', price: 24, available: true },
      ]},
      { name: 'Mains', order: 2, items: [
        { name: 'Tacos al pastor (3 szt.)', price: 32, available: true },
        { name: 'Burrito wołowe', price: 34, available: true },
        { name: 'Enchiladas z serem', price: 30, available: true },
        { name: 'Fajitas z krewetkami', price: 42, available: true },
      ]},
      { name: 'Napoje', order: 3, items: [
        { name: 'Margarita classic', price: 28, available: true },
        { name: 'Corona', price: 16, available: true },
        { name: 'Horchata', price: 14, available: true },
      ]},
    ],
  },
  {
    cuisine: 'indian',
    brandNames: ['Masala House', 'Curry Palace', 'Taj Mahal', 'Spice Garden', 'Namaste'],
    tags: ['indian', 'curry', 'tandoori'],
    menuCategories: [
      { name: 'Przystawki', order: 1, items: [
        { name: 'Samosa (3 szt.)', price: 18, available: true },
        { name: 'Pakora warzywna', price: 20, available: true },
        { name: 'Naan czosnkowy', price: 12, available: true },
      ]},
      { name: 'Curry', order: 2, items: [
        { name: 'Chicken Tikka Masala', price: 38, available: true },
        { name: 'Lamb Rogan Josh', price: 44, available: true },
        { name: 'Palak Paneer', price: 32, available: true },
        { name: 'Dal Makhani', price: 28, available: true },
        { name: 'Butter Chicken', price: 40, available: true },
      ]},
      { name: 'Napoje i desery', order: 3, items: [
        { name: 'Mango Lassi', price: 14, available: true },
        { name: 'Masala Chai', price: 10, available: true },
        { name: 'Gulab Jamun', price: 18, available: true },
      ]},
    ],
  },
  {
    cuisine: 'french',
    brandNames: ['Le Petit Bistro', 'Chez Marcel', 'Brasserie Lyon', 'Café de Paris', 'Maison Gourmande'],
    tags: ['french', 'bistro', 'fine-dining'],
    bookingDuration: 90,
    menuCategories: [
      { name: 'Entrées', order: 1, items: [
        { name: 'Soupe à l\'oignon', price: 24, available: true },
        { name: 'Tartare de boeuf', price: 38, available: true },
        { name: 'Escargots de Bourgogne', price: 36, available: true },
      ]},
      { name: 'Plats', order: 2, items: [
        { name: 'Confit de canard', price: 52, available: true },
        { name: 'Boeuf bourguignon', price: 48, available: true },
        { name: 'Moules-frites', price: 44, available: true },
        { name: 'Steak-frites', price: 56, available: true },
      ]},
      { name: 'Desserts et boissons', order: 3, items: [
        { name: 'Crème brûlée', price: 22, available: true },
        { name: 'Tarte Tatin', price: 24, available: true },
        { name: 'Vin rouge verre', price: 28, available: true },
        { name: 'Café allongé', price: 12, available: true },
      ]},
    ],
  },
  {
    cuisine: 'greek',
    brandNames: ['Taverna Zorba', 'Olympus', 'Mykonos Grill', 'Santorini', 'Poseidon'],
    tags: ['greek', 'mediterranean', 'grill'],
    menuCategories: [
      { name: 'Meze', order: 1, items: [
        { name: 'Tzatziki z pitą', price: 16, available: true },
        { name: 'Saganaki (ser smażony)', price: 24, available: true },
        { name: 'Sałatka grecka', price: 22, available: true },
      ]},
      { name: 'Dania główne', order: 2, items: [
        { name: 'Souvlaki z kurczaka', price: 34, available: true },
        { name: 'Gyros talerz', price: 36, available: true },
        { name: 'Moussaka', price: 38, available: true },
        { name: 'Grillowana ośmiornica', price: 52, available: true },
      ]},
      { name: 'Napoje', order: 3, items: [
        { name: 'Ouzo', price: 18, available: true },
        { name: 'Retsina kieliszek', price: 20, available: true },
        { name: 'Frappe', price: 14, available: true },
      ]},
    ],
  },
  {
    cuisine: 'coffee',
    brandNames: ['Kawa i Księga', 'Ziarnko', 'Barista Lab', 'Coffee Republic', 'Caffè Nero'],
    tags: ['cafe', 'coffee', 'brunch'],
    bookingDuration: 45,
    menuCategories: [
      { name: 'Kawy', order: 1, items: [
        { name: 'Espresso', price: 10, available: true },
        { name: 'Flat White', price: 16, available: true },
        { name: 'Cappuccino', price: 14, available: true },
        { name: 'V60 drip', price: 18, available: true },
      ]},
      { name: 'Śniadania', order: 2, items: [
        { name: 'Avocado toast', price: 24, available: true },
        { name: 'Eggs Benedict', price: 28, available: true },
        { name: 'Granola z jogurtem', price: 20, available: true },
        { name: 'Croissant z masłem', price: 12, available: true },
      ]},
      { name: 'Desery', order: 3, items: [
        { name: 'Szarlotka', price: 16, available: true },
        { name: 'Brownie', price: 14, available: true },
        { name: 'Cheesecake', price: 18, available: true },
      ]},
    ],
  },
];

const PLANS = ['free', 'standard', 'pro', 'premium'] as const;
const OWNER_EMAILS = ['owner2@gastroo.dev', 'owner3@gastroo.dev', 'owner4@gastroo.dev', 'owner5@gastroo.dev', 'owner6@gastroo.dev', 'owner7@gastroo.dev'];
const MEMBER_EMAILS = [
  'manager2@gastroo.dev', 'manager3@gastroo.dev', 'manager4@gastroo.dev', 'manager5@gastroo.dev', 'manager6@gastroo.dev',
  'chef3@gastroo.dev', 'chef4@gastroo.dev', 'chef5@gastroo.dev', 'chef6@gastroo.dev', 'chef7@gastroo.dev',
  'waiter3@gastroo.dev', 'waiter4@gastroo.dev', 'waiter5@gastroo.dev', 'waiter6@gastroo.dev', 'waiter7@gastroo.dev',
];

const GUEST_NAMES_FOR_BOOKINGS = [
  'Nowak', 'Kowalski', 'Wiśniewski', 'Wójcik', 'Kamiński', 'Lewandowski',
  'Zieliński', 'Szymański', 'Woźniak', 'Dąbrowski', 'Kozłowski', 'Jankowski',
  'Mazur', 'Krawczyk', 'Piotrowski', 'Grabowski', 'Nowakowski', 'Pawłowski',
  'Michalski', 'Dudek', 'Zając', 'Wieczorek', 'Król', 'Stępień',
];

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function generateRestaurants(): UnifiedSeedSource['additionalOrganizations'] {
  const generated: UnifiedSeedSource['additionalOrganizations'] = [];
  let counter = 0;

  for (const template of CUISINE_TEMPLATES) {
    for (let brandIdx = 0; brandIdx < template.brandNames.length; brandIdx++) {
      // Each brand across 2 cities
      for (let cityIdx = 0; cityIdx < 2; cityIdx++) {
        const city = POLISH_CITIES[(counter) % POLISH_CITIES.length];
        const brandName = template.brandNames[brandIdx];
        const fullName = `${brandName} ${city.name}`;
        const slug = generateSlug(fullName);
        const orgId = `gen-${slug}-org`;
        const restaurantId = `gen-${slug}`;

        const tablePrefix = `gen-${counter}`;
        const tableCount = 4 + (counter % 6); // 4–9 tables
        const tables: SeedTable[] = Array.from({ length: tableCount }, (_, i) => ({
          id: `${tablePrefix}-t${i + 1}`,
          number: i + 1,
          capacity: [2, 2, 4, 4, 6, 4, 2, 8, 4][i % 9],
          shape: (['round', 'square', 'square', 'rectangle', 'round', 'square'] as TableShape[])[i % 6],
          posX: 15 + (i % 4) * 22,
          posY: 20 + Math.floor(i / 4) * 30,
          status: (['free', 'free', 'occupied', 'free', 'reserved', 'free', 'free', 'free'] as TableStatus[])[i % 8],
          sectionId: `${tablePrefix}-s${i < Math.ceil(tableCount / 2) ? 1 : 2}`,
        }));

        const sections: SeedSection[] = [
          { id: `${tablePrefix}-s1`, name: 'Sala główna', color: '#3b82f6', order: 0 },
          { id: `${tablePrefix}-s2`, name: 'Ogródek', color: '#22c55e', order: 1 },
        ];

        // Generate 12 bookings spanning -1, 0, 1, 2
        const bookingTimes = ['10:00','11:30','12:00','12:30','13:00','14:30','17:00','18:00','18:30','19:00','19:30','20:00'];
        const bookings: SeedBooking[] = bookingTimes.map((time, i) => ({
          dayOffset: i < 2 ? -1 : i < 10 ? 0 : i < 11 ? 1 : 2,
          bookingTime: time,
          name: `${GUEST_NAMES_FOR_BOOKINGS[(counter * 5 + i) % GUEST_NAMES_FOR_BOOKINGS.length]}`,
          guestCount: 1 + ((counter + i) % 8),
          tableId: tables[i % tables.length].id,
          tableNumber: tables[i % tables.length].number,
          status: (i % 7 === 0 ? 'pending' : 'confirmed') as 'pending' | 'confirmed',
        }));

        const shifts: SeedShift[] = [
          { role: 'manager' as const, displayName: 'Auto Manager', startHour: 10, endHour: 20 },
          { role: 'chef' as const, displayName: 'Auto Chef', startHour: 9, endHour: 21 },
          { role: 'waiter' as const, displayName: 'Auto Kelner', startHour: 10, endHour: 22 },
        ];

        const restaurantData: SeedRestaurantData = {
          restaurant: {
            id: restaurantId,
            name: fullName,
            address: { street: `ul. Generowana ${counter + 1}`, city: city.name, postalCode: '00-001', country: 'Poland' },
            phone: `+48 ${100 + counter} 000 00 00`,
            timezone: 'Europe/Warsaw',
            location: { lat: city.lat + (counter % 10) * 0.005, lng: city.lng + (counter % 10) * 0.005 },
            tableCount,
            tags: template.tags,
            settings: {
              currency: 'PLN',
              language: 'pl',
              bookingDuration: template.bookingDuration ?? 60,
              depositAmount: counter % 3 === 0 ? 20 : 0,
            },
          },
          sections,
          tables,
          menuCategories: template.menuCategories,
          bookings,
          shifts,
          todoTasks: [
            { title: 'Otwarcie zmiany', assignedToRoles: ['manager'], isGroupTask: false, priority: 'high' as const, category: 'setup' as const },
            { title: 'Mise en place', assignedToRoles: ['chef'], isGroupTask: false, priority: 'high' as const, category: 'setup' as const },
          ],
          ingredients: [],
          recipes: [],
        };

        generated.push({
          organization: {
            id: orgId,
            name: brandName,
            slug,
            type: 'single_location',
            plan: PLANS[counter % PLANS.length],
            features: ['bookings', 'menu', 'team'],
            location: { lat: city.lat, lng: city.lng },
          },
          restaurantData,
          ownerEmails: [OWNER_EMAILS[counter % OWNER_EMAILS.length]],
          memberEmails: [
            MEMBER_EMAILS[(counter * 2) % MEMBER_EMAILS.length],
            MEMBER_EMAILS[(counter * 2 + 1) % MEMBER_EMAILS.length],
            MEMBER_EMAILS[(counter * 2 + 3) % MEMBER_EMAILS.length],
          ],
        });

        counter++;
      }
    }
  }

  return generated;
}

const generatedRestaurants = generateRestaurants();

// ─── Additional organizations (extracted for reuse in buildAuthUsers) ──────────

const additionalOrganizations: UnifiedSeedSource['additionalOrganizations'] = [
  {
    organization: {
      id: 'gastroo-fastfood-org',
      name: 'Gastroo Fast Food',
      slug: 'gastroo-fast-food',
      type: 'single_location',
      plan: 'standard',
      features: ['bookings', 'menu', 'team'],
      location: { lat: 54.3520, lng: 18.6466 },
    },
    restaurantData: fastFoodRestaurant,
    ownerEmails: ['owner2@gastroo.dev', 'partner@gastroo.dev'],
    memberEmails: ['manager2@gastroo.dev', 'waiter3@gastroo.dev', 'cashier@gastroo.dev', 'delivery@gastroo.dev'],
  },
  {
    organization: {
      id: 'gastroo-pizzeria-org',
      name: 'Gastroo Pizzeria',
      slug: 'gastroo-pizzeria',
      type: 'single_location',
      plan: 'premium',
      features: ['bookings', 'menu', 'team', 'analytics'],
      location: { lat: 51.1079, lng: 17.0385 },
    },
    restaurantData: pizzeriaRestaurant,
    ownerEmails: ['owner3@gastroo.dev', 'partner@gastroo.dev'],
    memberEmails: [
      'admin3@gastroo.dev',
      'manager3@gastroo.dev',
      'supervisor2@gastroo.dev',
      'waiter4@gastroo.dev',
      'chef4@gastroo.dev',
      'bartender2@gastroo.dev',
      'cashier2@gastroo.dev',
      'delivery2@gastroo.dev',
      'staff2@gastroo.dev',
    ],
  },
  // ── Wave 2: 10 new cities ──────────────────────────────────────────────────
  {
    organization: {
      id: 'gastroo-sushi-org',
      name: 'Sakura Sushi Group',
      slug: 'sakura-sushi',
      type: 'single_location',
      plan: 'premium',
      features: ['bookings', 'menu', 'team', 'analytics'],
      location: { lat: 51.7592, lng: 19.4560 },
    },
    restaurantData: sushiBarRestaurant,
    ownerEmails: ['owner4@gastroo.dev'],
    memberEmails: ['manager4@gastroo.dev', 'chef7@gastroo.dev', 'waiter5@gastroo.dev', 'waiter6@gastroo.dev'],
  },
  {
    organization: {
      id: 'gastroo-steakhouse-org',
      name: 'Angus & Co.',
      slug: 'angus-and-co',
      type: 'single_location',
      plan: 'premium',
      features: ['bookings', 'menu', 'team', 'analytics'],
      location: { lat: 50.2599, lng: 19.0216 },
    },
    restaurantData: steakhouseRestaurant,
    ownerEmails: ['owner5@gastroo.dev'],
    memberEmails: ['admin4@gastroo.dev', 'manager5@gastroo.dev', 'chef5@gastroo.dev', 'waiter7@gastroo.dev', 'sommelier2@gastroo.dev', 'bartender4@gastroo.dev'],
  },
  {
    organization: {
      id: 'gastroo-winebar-org',
      name: 'Winnica Bistro',
      slug: 'winnica-bistro',
      type: 'single_location',
      plan: 'pro',
      features: ['bookings', 'menu', 'team'],
      location: { lat: 53.4285, lng: 14.5528 },
    },
    restaurantData: wineBarRestaurant,
    ownerEmails: ['owner6@gastroo.dev'],
    memberEmails: ['manager6@gastroo.dev', 'sommelier@gastroo.dev', 'waiter5@gastroo.dev', 'chef6@gastroo.dev'],
  },
  {
    organization: {
      id: 'gastroo-vegan-org',
      name: 'Green Plate',
      slug: 'green-plate',
      type: 'single_location',
      plan: 'standard',
      features: ['bookings', 'menu', 'team'],
      location: { lat: 51.2465, lng: 22.5684 },
    },
    restaurantData: veganCafeRestaurant,
    ownerEmails: ['owner7@gastroo.dev'],
    memberEmails: ['manager4@gastroo.dev', 'chef6@gastroo.dev', 'waiter6@gastroo.dev', 'waiter7@gastroo.dev'],
  },
  {
    organization: {
      id: 'gastroo-brewery-org',
      name: 'Browar Bydgoski',
      slug: 'browar-bydgoski',
      type: 'single_location',
      plan: 'premium',
      features: ['bookings', 'menu', 'team', 'analytics'],
      location: { lat: 53.1235, lng: 18.0084 },
    },
    restaurantData: breweryPubRestaurant,
    ownerEmails: ['owner4@gastroo.dev'],
    memberEmails: ['manager6@gastroo.dev', 'chef5@gastroo.dev', 'bartender3@gastroo.dev', 'bartender4@gastroo.dev', 'waiter5@gastroo.dev'],
  },
  {
    organization: {
      id: 'gastroo-georgian-org',
      name: 'Chaczapuri House',
      slug: 'chaczapuri-house',
      type: 'single_location',
      plan: 'pro',
      features: ['bookings', 'menu', 'team'],
      location: { lat: 53.1325, lng: 23.1688 },
    },
    restaurantData: georgianRestaurant,
    ownerEmails: ['owner5@gastroo.dev'],
    memberEmails: ['manager5@gastroo.dev', 'chef7@gastroo.dev', 'waiter7@gastroo.dev', 'waiter6@gastroo.dev'],
  },
  {
    organization: {
      id: 'gastroo-pierogi-org',
      name: 'Pierogarnia Kopernik',
      slug: 'pierogarnia-kopernik',
      type: 'single_location',
      plan: 'standard',
      features: ['bookings', 'menu', 'team'],
      location: { lat: 53.0099, lng: 18.6047 },
    },
    restaurantData: pierogiRestaurant,
    ownerEmails: ['owner6@gastroo.dev'],
    memberEmails: ['manager4@gastroo.dev', 'chef5@gastroo.dev', 'chef6@gastroo.dev', 'waiter5@gastroo.dev', 'waiter7@gastroo.dev'],
  },
  {
    organization: {
      id: 'gastroo-medgrill-org',
      name: 'Olea Mediterranean',
      slug: 'olea-mediterranean',
      type: 'single_location',
      plan: 'pro',
      features: ['bookings', 'menu', 'team'],
      location: { lat: 50.0412, lng: 21.9991 },
    },
    restaurantData: medGrillRestaurant,
    ownerEmails: ['owner7@gastroo.dev'],
    memberEmails: ['manager5@gastroo.dev', 'chef7@gastroo.dev', 'waiter6@gastroo.dev', 'bartender3@gastroo.dev'],
  },
  {
    organization: {
      id: 'gastroo-brunch-org',
      name: 'Morning Glory',
      slug: 'morning-glory',
      type: 'single_location',
      plan: 'standard',
      features: ['bookings', 'menu', 'team'],
      location: { lat: 50.6751, lng: 17.9213 },
    },
    restaurantData: brunchRestaurant,
    ownerEmails: ['owner6@gastroo.dev'],
    memberEmails: ['manager6@gastroo.dev', 'chef6@gastroo.dev', 'waiter5@gastroo.dev', 'bartender3@gastroo.dev'],
  },
  {
    organization: {
      id: 'gastroo-ramen-org',
      name: 'Tonkotsu Ramen',
      slug: 'tonkotsu-ramen',
      type: 'single_location',
      plan: 'pro',
      features: ['bookings', 'menu', 'team'],
      location: { lat: 50.8661, lng: 20.6286 },
    },
    restaurantData: ramenBarRestaurant,
    ownerEmails: ['owner4@gastroo.dev'],
    memberEmails: ['manager4@gastroo.dev', 'chef7@gastroo.dev', 'waiter7@gastroo.dev'],
  },
  // ── Wave 3: 100 generated restaurants ────────────────────────────────────────
  ...generatedRestaurants,
];

// ─── Build enriched auth users (single source of truth) ───────────────────────

function buildAuthUsers(): AuthSeedUser[] {
  // 1. Compute organization memberships per email
  const orgsByEmail = new Map<string, string[]>();
  const coreOrgId = masterConfig.organization.id;

  for (const u of coreUsers) {
    orgsByEmail.set(u.email, [coreOrgId]);
  }

  for (const addOrg of additionalOrganizations) {
    const orgId = addOrg.organization.id;
    for (const email of [...addOrg.ownerEmails, ...(addOrg.memberEmails ?? [])]) {
      const existing = orgsByEmail.get(email) ?? [];
      if (!existing.includes(orgId)) {
        existing.push(orgId);
        orgsByEmail.set(email, existing);
      }
    }
  }

  // 2. Pomijamy fixtureMap – fixtureUsers usunięte, nie używamy danych testowych

  // 3. Staff users (isGastronaut=true)
  const staff: AuthSeedUser[] = coreUsers.map((u) => {
    const [first, ...rest] = u.displayName.split(' ');
    return {
      email: u.email,
      password: u.password,
      firstName: first,
      lastName: rest.join(' '),
      phone: '',
      isGastronaut: true,
      organization: orgsByEmail.get(u.email) ?? [coreOrgId],
      displayName: u.displayName,
    };
  });

  // 4. Consumer users (isGastronaut=false, no organization)
  const consumers: AuthSeedUser[] = unassignedUsers.map((u) => {
    const [first, ...rest] = u.displayName.split(' ');
    return {
      email: u.email,
      password: u.password,
      firstName: first,
      lastName: rest.join(' '),
      phone: '',
      isGastronaut: false,
      organization: [],
      displayName: u.displayName,
    };
  });

  return [...staff, ...consumers];
}

export const UNIFIED_SEED_SOURCE: UnifiedSeedSource = {
  version: '2026.03.unified.1',
  projectId: 'gastroo-4f0a3',
  snapshotDir: './.firebase/emulator-data',
  masterConfig,
  extraRestaurants: [], // usunięto secondaryRestaurant, brak definicji
  authUsers: buildAuthUsers(),
  unassignedUsers,
  promotions,
  events: demoEvents,
  additionalOrganizations,
  profiles: {
    core: { seedAuth: true, seedFirestore: true, seedIntegration: false },
    demo: { seedAuth: true, seedFirestore: true, seedIntegration: false },
    integration: { seedAuth: true, seedFirestore: true, seedIntegration: true },
    all: { seedAuth: true, seedFirestore: true, seedIntegration: true },
  },
};

export function resolveSeedProfile(raw: string | undefined): UnifiedSeedProfile {
  const value = (raw || 'demo').toLowerCase();
  if (value === 'core' || value === 'demo' || value === 'integration' || value === 'all') {
    return value;
  }
  return 'demo';
}
