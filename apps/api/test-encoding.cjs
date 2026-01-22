const fs = require("fs");
const iconv = require("iconv-lite");

// Sciezka do przykladowego pliku
const csvPath = "c:/Users/Krzysztof/Desktop/AKROBUD/impl/przykladowe pliki/dostawy szyb/04188_01469.csv";

// Wczytaj jako Buffer
const buffer = fs.readFileSync(csvPath);
console.log("Buffer length:", buffer.length);

// Dekoduj z CP1250
const content = iconv.decode(buffer, "win1250");

// Pokaz pierwsze 500 znakow
console.log("\nNaglowek CSV (zdekodowany z CP1250):");
console.log(content.substring(0, 500));
console.log("\n---");

// Sprawdz czy zawiera zamowienia
if (content.includes("zamowienia") || content.includes("zamówienia")) {
  console.log("OK: Kolumna zamowienia klienta znaleziona\!");
} else {
  console.log("BLAD: Brak kolumny zamowienia klienta");
}
