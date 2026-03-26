/**
 * Konfiguracja seed dla głównej restauracji demonstracyjnej "Bistro Gastroo".
 *
 * organization i users są importowane z fixtures (tests/fixtures/index.ts).
 * Ten plik eksportuje SeedConfig (główna restauracja + shifts/todo/inventory/recipes).
 */

import type { SeedConfig } from './types';
import {
  menuCategories as fixtureMenuCategories,
  organization,
  restaurant,
  sections,
  tables,
  users as fixtureUsers,
} from '../../tests/fixtures';

const config: SeedConfig = {

  organization,
  restaurant,
  sections: sections as SeedConfig['sections'],
  tables: tables as SeedConfig['tables'],

  // Użytkownicy są definiowani centralnie w scripts/seeds/source.ts.
  users: fixtureUsers as SeedConfig['users'],

  // ─── Menu ─────────────────────────────────────────────────────────────────

  menuCategories: [
    ...(fixtureMenuCategories as SeedConfig['menuCategories']),
    {
      name: 'Pasty i risotto', order: 50,
      items: [
        { name: 'Tagliatelle truflowe', price: 49, description: 'Parmezan, oliwa truflowa, pieprz', available: true },
        { name: 'Ravioli szpinak-ricotta', price: 44, description: 'Maslo szalwiowe, chips z parmezanu', available: true },
        { name: 'Risotto grzybowe', price: 46, description: 'Portobello, biale wino, tymianek', available: true },
        { name: 'Penne arrabbiata', price: 38, description: 'Pomidory, chili, czosnek, bazylia', available: true },
      ],
    },
    {
      name: 'Street i comfort', order: 51,
      items: [
        { name: 'Burger angus', price: 43, description: 'Cheddar, bekon, frytki stekowe', available: true },
        { name: 'Fish & chips', price: 41, description: 'Losos w panierce panko, remulada', available: true },
        { name: 'Kanapka club', price: 35, description: 'Kurczak, boczek, pomidor, aioli', available: true },
        { name: 'Wrap wege', price: 33, description: 'Falafel, hummus, warzywa sezonowe', available: true },
      ],
    },
  ],

  // ─── Rezerwacje (±3 dni od dnia seed) ────────────────────────────────────

  bookings: [],

  // ─── Zmiany (dzisiejsze) ──────────────────────────────────────────────────

  // Zmiany (shifts) zdefiniowane jako fixture lub dynamicznie (można podmienić na import z fixtures/shifts.json jeśli powstanie)
  shifts: [
    { role: 'manager',    displayName: 'Anna Kowalczyk',       startHour: 15, endHour: 23 },
    { role: 'supervisor', displayName: 'Karolina Jabłońska',   startHour: 18, endHour: 23 },
    { role: 'waiter',     displayName: 'Paweł Nowak',          startHour: 14, endHour: 22 },
    { role: 'waiter',     displayName: 'Nina Kelnerowa',       startHour: 15, endHour: 23 },
    { role: 'bartender',  displayName: 'Piotr Dąbrowski',      startHour: 16, endHour: 23 },
    { role: 'sommelier',  displayName: 'Sylwia Sommelier',     startHour: 17, endHour: 23 },
    { role: 'chef',       displayName: 'Marek Zielewski',      startHour: 13, endHour: 21 },
    { role: 'chef',       displayName: 'Magdalena Kucharza',   startHour: 14, endHour: 22 },
    { role: 'kitchen',    displayName: 'Piotr Pomoc Kuchni',   startHour: 13, endHour: 19 },
    { role: 'cashier',    displayName: 'Joanna Kwiatkowska',   startHour: 14, endHour: 22 },
  ],

  // ─── Składniki ────────────────────────────────────────────────────────────

  ingredients: [
    // Mięso
    { id: 'ing-polendwica',  name: 'Polędwica wołowa',  unit: 'g',   category: 'meat',       allergens: [],            stockQuantity: 5000,  minStockQuantity: 1000, unitCost: 0.09  },
    { id: 'ing-wolowina',    name: 'Mięso wołowe',       unit: 'g',   category: 'meat',       allergens: [],            stockQuantity: 8000,  minStockQuantity: 2000, unitCost: 0.06  },
    // Ryby
    { id: 'ing-losos',       name: 'Łosoś atlantycki',   unit: 'g',   category: 'fish',       allergens: ['fish'],      stockQuantity: 4000,  minStockQuantity: 800,  unitCost: 0.07  },
    // Nabiał
    { id: 'ing-maslo',       name: 'Masło',               unit: 'g',   category: 'dairy',      allergens: ['milk'],      stockQuantity: 2000,  minStockQuantity: 500,  unitCost: 0.025 },
    { id: 'ing-parmezan',    name: 'Parmezan',             unit: 'g',   category: 'dairy',      allergens: ['milk'],      stockQuantity: 1500,  minStockQuantity: 300,  unitCost: 0.055 },
    { id: 'ing-mascarpone',  name: 'Mascarpone',           unit: 'g',   category: 'dairy',      allergens: ['milk'],      stockQuantity: 1000,  minStockQuantity: 200,  unitCost: 0.03  },
    { id: 'ing-smietana',    name: 'Śmietana 30%',         unit: 'ml',  category: 'dairy',      allergens: ['milk'],      stockQuantity: 2000,  minStockQuantity: 400,  unitCost: 0.01  },
    // Jaja
    { id: 'ing-jajka',       name: 'Jajka świeże',         unit: 'szt', category: 'dairy',      allergens: ['eggs'],      stockQuantity: 60,    minStockQuantity: 12,   unitCost: 0.8   },
    { id: 'ing-zoltko',      name: 'Żółtko jajka',         unit: 'szt', category: 'dairy',      allergens: ['eggs'],      stockQuantity: 30,    minStockQuantity: 6,    unitCost: 0.5   },
    // Zboża / mąki
    { id: 'ing-maka',        name: 'Mąka pszenna',          unit: 'g',   category: 'grains',     allergens: ['gluten'],    stockQuantity: 5000,  minStockQuantity: 1000, unitCost: 0.003 },
    { id: 'ing-ryz',         name: 'Ryż jaśminowy',         unit: 'g',   category: 'grains',     allergens: [],            stockQuantity: 3000,  minStockQuantity: 500,  unitCost: 0.008 },
    { id: 'ing-ryz-arborio', name: 'Ryż arborio',           unit: 'g',   category: 'grains',     allergens: [],            stockQuantity: 2000,  minStockQuantity: 400,  unitCost: 0.012 },
    { id: 'ing-bulka',       name: 'Bułka brioche',         unit: 'szt', category: 'grains',     allergens: ['gluten', 'eggs', 'milk'], stockQuantity: 20, minStockQuantity: 5, unitCost: 2.5 },
    { id: 'ing-chleb',       name: 'Chleb tostowy',         unit: 'szt', category: 'grains',     allergens: ['gluten'],    stockQuantity: 30,    minStockQuantity: 6,    unitCost: 0.6   },
    // Warzywa
    { id: 'ing-szpinak',     name: 'Szpinak świeży',        unit: 'g',   category: 'vegetables', allergens: [],            stockQuantity: 2000,  minStockQuantity: 400,  unitCost: 0.012 },
    { id: 'ing-cebula',      name: 'Cebula',                 unit: 'g',   category: 'vegetables', allergens: [],            stockQuantity: 3000,  minStockQuantity: 500,  unitCost: 0.004 },
    { id: 'ing-czosnek',     name: 'Czosnek',                unit: 'g',   category: 'vegetables', allergens: [],            stockQuantity: 500,   minStockQuantity: 100,  unitCost: 0.02  },
    { id: 'ing-pomidory',    name: 'Pomidory świeże',        unit: 'g',   category: 'vegetables', allergens: [],            stockQuantity: 3000,  minStockQuantity: 500,  unitCost: 0.008 },
    { id: 'ing-seler',       name: 'Seler naciowy',          unit: 'g',   category: 'vegetables', allergens: ['celery'],    stockQuantity: 1000,  minStockQuantity: 200,  unitCost: 0.01  },
    // Grzyby
    { id: 'ing-portobello',  name: 'Portobello',             unit: 'g',   category: 'vegetables', allergens: [],            stockQuantity: 2000,  minStockQuantity: 400,  unitCost: 0.03  },
    // Przyprawy
    { id: 'ing-sol',         name: 'Sól morska',             unit: 'g',   category: 'spices',     allergens: [],            stockQuantity: 2000,  minStockQuantity: 200,  unitCost: 0.001 },
    { id: 'ing-pieprz',      name: 'Pieprz czarny mielony',  unit: 'g',   category: 'spices',     allergens: [],            stockQuantity: 500,   minStockQuantity: 50,   unitCost: 0.02  },
    { id: 'ing-bazylia',     name: 'Bazylia świeża',         unit: 'g',   category: 'spices',     allergens: [],            stockQuantity: 200,   minStockQuantity: 30,   unitCost: 0.08  },
    { id: 'ing-tymianek',    name: 'Tymianek',               unit: 'g',   category: 'spices',     allergens: [],            stockQuantity: 200,   minStockQuantity: 30,   unitCost: 0.05  },
    // Oleje
    { id: 'ing-oliwa',       name: 'Oliwa z oliwek EV',      unit: 'ml',  category: 'oils',       allergens: [],            stockQuantity: 3000,  minStockQuantity: 500,  unitCost: 0.02  },
    { id: 'ing-truflowa',    name: 'Oliwa truflowa',         unit: 'ml',  category: 'oils',       allergens: [],            stockQuantity: 500,   minStockQuantity: 100,  unitCost: 0.15  },
    // Sosy i inne
    { id: 'ing-kapary',      name: 'Kapary',                 unit: 'g',   category: 'sauces',     allergens: [],            stockQuantity: 500,   minStockQuantity: 100,  unitCost: 0.04  },
    { id: 'ing-musztarda',   name: 'Musztarda Dijon',        unit: 'g',   category: 'sauces',     allergens: ['mustard'],   stockQuantity: 500,   minStockQuantity: 100,  unitCost: 0.02  },
    { id: 'ing-ketchup',     name: 'Ketchup',                unit: 'g',   category: 'sauces',     allergens: [],            stockQuantity: 1000,  minStockQuantity: 200,  unitCost: 0.01  },
    { id: 'ing-cheddar',     name: 'Cheddar plastry',        unit: 'g',   category: 'dairy',      allergens: ['milk'],      stockQuantity: 1000,  minStockQuantity: 200,  unitCost: 0.045 },
    // Kawa / napoje
    { id: 'ing-kawa',        name: 'Espresso (shot)',        unit: 'por', category: 'beverages',  allergens: [],            stockQuantity: 200,   minStockQuantity: 20,   unitCost: 1.5   },
    // Owoce / sos
    { id: 'ing-maliny',      name: 'Maliny (sos)',           unit: 'g',   category: 'fruits',     allergens: [],            stockQuantity: 1000,  minStockQuantity: 200,  unitCost: 0.025 },
    { id: 'ing-bulion',      name: 'Bulion warzywny',        unit: 'ml',  category: 'other',      allergens: ['celery'],    stockQuantity: 5000,  minStockQuantity: 500,  unitCost: 0.005 },
    { id: 'ing-wino-biale',  name: 'Wino białe (do gotowania)', unit: 'ml', category: 'alcohol',  allergens: ['sulphites'], stockQuantity: 3000,  minStockQuantity: 500,  unitCost: 0.015 },
    { id: 'ing-cukier',      name: 'Cukier',                  unit: 'g',   category: 'other',      allergens: [],            stockQuantity: 3000,  minStockQuantity: 500,  unitCost: 0.003 },
  ],

  // ─── Receptury ────────────────────────────────────────────────────────────

  recipes: [
    {
      menuItemName: 'Tatar wołowy',
      basePrepTimeMin: 10,
      servings: 1,
      preparationSteps: 'Mięso posiekać nożem na drobno. Wymieszać z kaparami, musztardą i cebulą. Formować na talerzu. Podać z żółtkiem i tostami.',
      ingredients: [
        { ingredientId: 'ing-wolowina',  quantity: 150, unit: 'g',   preparationNote: 'Posiekać nożem, nie mielić' },
        { ingredientId: 'ing-kapary',    quantity: 20,  unit: 'g'   },
        { ingredientId: 'ing-zoltko',    quantity: 1,   unit: 'szt', preparationNote: 'Świeże, w połówce skorupki' },
        { ingredientId: 'ing-musztarda', quantity: 10,  unit: 'g'   },
        { ingredientId: 'ing-cebula',    quantity: 30,  unit: 'g',   preparationNote: 'Bardzo drobno posiekać' },
        { ingredientId: 'ing-chleb',     quantity: 2,   unit: 'szt', preparationNote: 'Opiec na złoto' },
        { ingredientId: 'ing-sol',       quantity: 2,   unit: 'g'   },
        { ingredientId: 'ing-pieprz',    quantity: 1,   unit: 'g'   },
      ],
    },
    {
      menuItemName: 'Bruschetta',
      basePrepTimeMin: 8,
      servings: 1,
      preparationSteps: 'Chleb opiec. Natrzeć czosnkiem. Pomidory pokroić w kostkę, wymieszać z oliwą i bazylią. Nałożyć na chleb.',
      ingredients: [
        { ingredientId: 'ing-chleb',    quantity: 3,   unit: 'szt', preparationNote: 'Grube kromki, opiec na grillu' },
        { ingredientId: 'ing-pomidory', quantity: 200, unit: 'g',   preparationNote: 'Pokroić w drobną kostkę, odsączyć' },
        { ingredientId: 'ing-czosnek',  quantity: 10,  unit: 'g',   preparationNote: 'Przekroić i natrzeć chleb' },
        { ingredientId: 'ing-bazylia',  quantity: 10,  unit: 'g'   },
        { ingredientId: 'ing-oliwa',    quantity: 30,  unit: 'ml'  },
        { ingredientId: 'ing-sol',      quantity: 2,   unit: 'g'   },
        { ingredientId: 'ing-pieprz',   quantity: 1,   unit: 'g'   },
      ],
    },
    {
      menuItemName: 'Stek z polędwicy',
      basePrepTimeMin: 18,
      servings: 1,
      preparationSteps: 'Mięso w temp. pokojowej 30 min. Przyprawić solą i pieprzem. Smażyć na maśle klarowanym 2 min / stronę (medium). Odpocząć 5 min. Podać z warzywami i ziemniakami.',
      ingredients: [
        { ingredientId: 'ing-polendwica', quantity: 250, unit: 'g',   preparationNote: 'Wysokiej jakości kawałek' },
        { ingredientId: 'ing-maslo',      quantity: 20,  unit: 'g',   preparationNote: 'Masło klarowane' },
        { ingredientId: 'ing-sol',        quantity: 3,   unit: 'g'   },
        { ingredientId: 'ing-pieprz',     quantity: 2,   unit: 'g'   },
        { ingredientId: 'ing-tymianek',   quantity: 5,   unit: 'g'   },
      ],
    },
  ],

  // ─── Zadania (dzisiejsze) ─────────────────────────────────────────────────

  todoTasks: [
    {
      title: 'Przygotuj menu',
      description: 'Wydrukuj dziś. menu fusion, sprawdź dostępność składników.',
      assignedToRoles: ['chef', 'manager'],
      isGroupTask: false, priority: 'high', category: 'setup',
    },
    {
      title: 'Uzupełnij zastawę i zapachy na stolikach',
      description: 'Kwiaty, świeczki — wszystkie stoliki przed otwarciem.',
      assignedToRoles: ['waiter'],
      isGroupTask: true, priority: 'medium', category: 'setup',
    },
    {
      title: 'Sprawdź widoczność na Google Business',
      description: 'Zaktualizuj godziny otwarcia, zdjęcia i opinię z wczoraj.',
      assignedToRoles: ['manager'],
      isGroupTask: false, priority: 'low', category: 'general',
    },
    {
      title: 'Otwórz system POS i kasę fiskalną',
      description: 'Sprawdź salda, raport otwarcia kasy, testy połączenia.',
      assignedToRoles: ['cashier', 'manager'],
      isGroupTask: false, priority: 'high', category: 'finance',
    },
    {
      title: 'Zaakceptuj rezerwacje z portalu',
      description: 'Sprawdź nowe rezerwacje z Pyszne.pl / Wolt — potwierdź hostem.',
      assignedToRoles: ['manager'],
      isGroupTask: false, priority: 'high', category: 'general',
    },
    {
      title: 'Przygotuj się do kolacji weselnej',
      description: 'Stolik nr 5 (weselna kolacja) — bukiet i świece na 19:00.',
      assignedToRoles: ['waiter', 'manager'],
      isGroupTask: true, priority: 'high', category: 'setup',
    },
  ],
};

export default config;
