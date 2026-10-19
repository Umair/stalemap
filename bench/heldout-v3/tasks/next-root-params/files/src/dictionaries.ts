export const dictionaries = {
  en: {
    home: { title: "Welcome to Fernweh Travel", intro: "Small-group trips across Europe." },
    footer: { contact: "Contact us", rights: "All rights reserved." },
  },
  fr: {
    home: { title: "Bienvenue chez Fernweh Travel", intro: "Voyages en petits groupes à travers l'Europe." },
    footer: { contact: "Nous contacter", rights: "Tous droits réservés." },
  },
  de: {
    home: { title: "Willkommen bei Fernweh Travel", intro: "Kleingruppenreisen durch Europa." },
    footer: { contact: "Kontakt", rights: "Alle Rechte vorbehalten." },
  },
};

export type Locale = keyof typeof dictionaries;
export type Dictionary = (typeof dictionaries)[Locale];
export const defaultLocale: Locale = "en";
