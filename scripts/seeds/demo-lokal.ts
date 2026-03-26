/**
 * Konfiguracja seed dla drugiego lokalu demonstracyjnego "Lokal Gastroo".
 * Sąsiedzka knajpka z kuchnią polską — kontrast do Bistro Testowe.
 *
 * organization i users są ignorowane przez seed.ts (używa ich z demo-bistro.ts).
 * Ten plik eksportuje SeedRestaurantData.
 */

import type { SeedRestaurantData } from './types';

const config: SeedRestaurantData = {

  // ─── Restauracja ──────────────────────────────────────────────────────────

  restaurant: {
    id:   'demo-lokal',
    name: 'Lokal Gastroo',
    description: 'Sasiedzki lokal z klasyczna kuchnia polska i prostym menu lunchowym.',
    address: {
      street:     'ul. Floriańska 5',
      city:       'Kraków',
      postalCode: '31-019',
      country:    'Poland',
    },
    phone:    '+48 12 345 67 89',
    website: 'https://lokal-gastroo.pl',
    timezone: 'Europe/Warsaw',
    location: { lat: 50.0617, lng: 19.9373 },
    tags: ['polish', 'krakow', 'lunch', 'local'],
    tableCount: 6,
    gbpAttributes: {
      petFriendly: true,
      lgbtFriendly: true,
      veganOptions: false,
      outdoorSeating: false,
      familyFriendly: true,
    },
    settings: {
      currency:        'PLN',
      language:        'pl',
      bookingDuration: 75,
      depositAmount:   0,
    },
  },

  // ─── Sekcje sali ──────────────────────────────────────────────────────────

  sections: [
    { id: 'lokal-sala', name: 'Sala',    color: '#fb923c', order: 0 },
    { id: 'lokal-bar',  name: 'Przy barze', color: '#60a5fa', order: 1 },
  ],

  // ─── Stoliki ──────────────────────────────────────────────────────────────

  tables: [
    { id: 'lokal-t1', number: 1, capacity: 2, shape: 'round',     posX: 15, posY: 15, status: 'free',     sectionId: 'lokal-sala' },
    { id: 'lokal-t2', number: 2, capacity: 2, shape: 'round',     posX: 40, posY: 15, status: 'occupied', sectionId: 'lokal-sala' },
    { id: 'lokal-t3', number: 3, capacity: 4, shape: 'rectangle', posX: 15, posY: 50, status: 'reserved', sectionId: 'lokal-sala' },
    { id: 'lokal-t4', number: 4, capacity: 4, shape: 'rectangle', posX: 45, posY: 50, status: 'free',     sectionId: 'lokal-sala' },
    { id: 'lokal-t5', number: 5, capacity: 6, shape: 'square',    posX: 25, posY: 80, status: 'free',     sectionId: 'lokal-sala' },
    { id: 'lokal-t6', number: 6, capacity: 2, shape: 'round',     posX: 78, posY: 35, status: 'free',     sectionId: 'lokal-bar',  name: 'Bar' },
  ],

  // ─── Menu ─────────────────────────────────────────────────────────────────

  menuCategories: [
    {
      name: 'Zupy', order: 1,
      items: [
        { name: 'Żurek staropolski',    price: 16, description: 'Z białą kiełbasą i jajkiem, chleb na zakwasie', available: true },
        { name: 'Barszcz czerwony',     price: 12, description: 'Z uszkami z kapustą i grzybami',               available: true },
        { name: 'Rosół domowy',         price: 14, description: 'Na kości z makaronem, natka pietruszki',        available: true },
        { name: 'Kapuśniak',            price: 15, description: 'Z kiszoną kapustą i żeberkami',                 available: true },
      ],
    },
    {
      name: 'Dania główne', order: 2,
      items: [
        { name: 'Pierogi ruskie',        price: 28, description: 'Z ziemniakiem i serem, ze śmietaną lub skwarkami', available: true },
        { name: 'Pierogi z kapustą',     price: 26, description: 'Z kiszoną kapustą i grzybami',                     available: true },
        { name: 'Pierogi z mięsem',      price: 31, description: 'Ręcznie lepione, z podsmażaną cebulką',            available: true },
        { name: 'Bigos myśliwski',       price: 32, description: 'Z kiełbasą i boczkiem, podany z chlebem',          available: true },
        { name: 'Kotlet schabowy',       price: 38, description: 'Z ziemniakami i mizerią',                          available: true },
        { name: 'Kotlet mielony',        price: 33, description: 'Z buraczkami i puree ziemniaczanym',               available: true },
        { name: 'Gołąbki w sosie',       price: 35, description: 'Dwa gołąbki w sosie pomidorowym z ryżem',          available: true },
        { name: 'Kluski śląskie',        price: 29, description: 'Z sosem pieczeniowym i zasmażaną kapustą',         available: true },
        { name: 'Flaki wołowe',          price: 30, description: 'Tradycyjne flaki z warzywami i majerankiem',       available: false },
        { name: 'Placki ziemniaczane',   price: 24, description: 'Ze śmietaną lub gulaszem, 3 szt.',                 available: true },
        { name: 'Gulasz wołowy',         price: 36, description: 'Wolno duszony z kaszą i ogórkiem kiszonym',        available: true },
        { name: 'Devolay',               price: 37, description: 'Z masełkiem ziołowym i frytkami stekowymi',        available: true },
        { name: 'Karkówka pieczona',     price: 39, description: 'W sosie własnym z kluskami śląskimi',              available: true },
      ],
    },
    {
      name: 'Śniadania i lunche', order: 5,
      items: [
        { name: 'Jajecznica na maśle',   price: 18, description: '3 jajka, pieczywo, masło',                         available: true },
        { name: 'Szakszuka',             price: 22, description: 'Pomidory, papryka, jajka, natka',                  available: true },
        { name: 'Kanapka drwala',        price: 21, description: 'Boczek, ser, ogórek kiszony, sos domowy',          available: true },
        { name: 'Zestaw dnia',           price: 34, description: 'Zupa + danie główne + kompot',                     available: true },
      ],
    },
    {
      name: 'Desery', order: 3,
      items: [
        { name: 'Szarlotka',             price: 14, description: 'Ciepła, z bitą śmietaną lub lodami',    available: true },
        { name: 'Sernik krakowski',      price: 13, description: 'Tradycyjny, z rodzynkami',               available: true },
        { name: 'Makowiec domowy',       price: 12, description: 'Zawijany, z lukrem',                     available: true },
      ],
    },
    {
      name: 'Napoje', order: 4,
      items: [
        { name: 'Kawa z ekspresu',       price: 8,  description: 'Espresso, Americano, Cappuccino',        available: true },
        { name: 'Herbata',               price: 6,  description: 'Czarna lub owocowa',                     available: true },
        { name: 'Kompot domowy',         price: 7,  description: 'Sezonowe owoce, bez cukru',              available: true },
        { name: 'Piwo z kranu 0.5L',     price: 14, description: 'Żywiec lub Okocim',                      available: true },
        { name: 'Wódka 50ml',            price: 10, description: 'Żytnia lub Wyborowa',                    available: true },
        { name: 'Woda mineralna',        price: 5,  description: '0.5L, gazowana lub niegazowana',         available: true },
        { name: 'Sok owocowy',           price: 7,  description: 'Jabłkowy, pomarańczowy lub pomidorowy',  available: true },
      ],
    },
  ],

  // ─── Rezerwacje (±3 dni od dnia seed) ────────────────────────────────────

  bookings: [
    // -3
    { dayOffset: -3, bookingTime: '12:00', name: 'Nowak Zbigniew',       guestCount: 2, guestPhone: '+48 601 500 100', tableId: 'lokal-t1', tableNumber: 1 },
    { dayOffset: -3, bookingTime: '13:30', name: 'Kowalska Helena',      guestCount: 4, notes: 'Urodziny babci',  tableId: 'lokal-t3', tableNumber: 3 },
    { dayOffset: -3, bookingTime: '19:00', name: 'Wiśniewscy',           guestCount: 6,                           tableId: 'lokal-t5', tableNumber: 5 },
    // -1
    { dayOffset: -1, bookingTime: '12:30', name: 'Piotrek z rodziną',    guestCount: 4,                           tableId: 'lokal-t4', tableNumber: 4 },
    { dayOffset: -1, bookingTime: '18:00', name: 'Krawczyk Józef',       guestCount: 2, source: 'phone',          tableId: 'lokal-t2', tableNumber: 2 },
    // +1
    { dayOffset: +1, bookingTime: '12:00', name: 'Dąbrowska Zofia',      guestCount: 2,                           tableId: 'lokal-t1', tableNumber: 1 },
    { dayOffset: +1, bookingTime: '13:00', name: 'Mazurczyk Roman',      guestCount: 4, guestPhone: '+48 602 300 400', tableId: 'lokal-t3', tableNumber: 3 },
    { dayOffset: +1, bookingTime: '19:00', name: 'Jakubowscy',           guestCount: 6, notes: 'Komunia',         tableId: 'lokal-t5', tableNumber: 5 },
    // +2
    { dayOffset: +2, bookingTime: '12:30', name: 'Bednarz Stanisław',    guestCount: 2,                           tableId: 'lokal-t6', tableNumber: 6 },
    { dayOffset: +2, bookingTime: '19:30', name: 'Wróbel Jadwiga',       guestCount: 4, source: 'online',         tableId: 'lokal-t4', tableNumber: 4 },
  ],

  // ─── Zmiany (dzisiejsze) ──────────────────────────────────────────────────

  shifts: [
    { role: 'manager',   displayName: 'Marta Manager',      startHour: 14, endHour: 22 },
    { role: 'waiter',    displayName: 'Karol Kelner',        startHour: 13, endHour: 21 },
    { role: 'waiter',    displayName: 'Nina Kelnerowa',      startHour: 15, endHour: 23 },
    { role: 'chef',      displayName: 'Krzysztof Kucharz',   startHour: 12, endHour: 20 },
    { role: 'chef',      displayName: 'Magdalena Kucharza',  startHour: 14, endHour: 22 },
    { role: 'bartender', displayName: 'Bartosz Barman',      startHour: 16, endHour: 23 },
  ],

  // ─── Zadania (dzisiejsze) ─────────────────────────────────────────────────

  todoTasks: [
    {
      title: 'Uzupełnij cukiernice i solniczki',
      description: 'Wszystkie stoliki przed 12:00.',
      assignedToRoles: ['waiter'],
      isGroupTask: true, priority: 'medium', category: 'setup',
    },
    {
      title: 'Sprawdź datę ważności pierożków mrożonych',
      description: 'Zamrozony zapas w dolnej szufladzie chłodni nr 2.',
      assignedToRoles: ['chef'],
      isGroupTask: false, priority: 'high', category: 'safety',
    },
    {
      title: 'Zamów beczki piwa na weekend',
      description: 'Min. 2 beczki Żywca i 1 Okocima na piątek.',
      assignedToRoles: ['manager'],
      isGroupTask: false, priority: 'medium', category: 'general',
    },
    {
      title: 'Umyj okna od zewnątrz',
      description: 'Szyby witryny — wyczyść przed otwarciem.',
      assignedToRoles: ['waiter', 'staff'],
      isGroupTask: true, priority: 'low', category: 'cleaning',
    },
    {
      title: 'Otwórz kasę i przelicz utarg',
      description: 'Raport otwarcia kasy fiskalnej.',
      assignedToRoles: ['manager', 'admin'],
      isGroupTask: false, priority: 'high', category: 'finance',
    },
    {
      title: 'Sprawdź stan mąki i ziemniaków',
      description: 'Na pierogi i placki — zamów jeśli poniżej 5 kg.',
      assignedToRoles: ['chef'],
      isGroupTask: false, priority: 'medium', category: 'general',
    },
  ],
};

export default config;
