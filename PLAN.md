# Claude Clicker – Spielplan (Sci-Fi)

Ein Aufbau- und Inkrementalspiel im Weltraum: Man baut auf verschiedenen Planeten Erze ab,
verarbeitet sie in Produktionsketten wie in **Factorio** auf einem echten Raster und baut
immer bessere Maschinen. Builds entstehen durch **Skilltrees wie in Path of Exile 2**: ein
großer Kommandanten-Baum plus ein eigener Baum für jeden Maschinentyp. Dazu kommen Module mit
Affixen, Bedrohungen und Bosse mit eigenen Items, aktive Skills sowie Prestige und Paragon.

---

## 1. Design-Säulen

1. **Echte Fabrik, große Zahlen.** Man platziert Maschinen und Förderbänder selbst. Das
   Wachstum kommt aber nicht über die Menge an Maschinen, sondern über Maschinenstufen, Skilltrees
   und Module. Platz ist knapp, Qualität schlägt Masse.
2. **Ein Modifier-System für alles.** Kommandanten-Baum, Maschinenbäume, Module, Boss-Items und
   Paragon liefern dieselben Modifier (Flat / Increased / More) in eine zentrale Stat-Engine.
3. **Räumliche Builds.** Die Anordnung auf dem Raster zählt: Nachbarschafts-Boni, Cluster,
   Reichweiten. Ein Skilltree-Keystone kann ändern, wie man eine Fabrik baut.
4. **Jeder Planet spielt sich anders.** Eigene Erze, Umweltbedingungen, Energiequellen,
   Bedrohungen und Bosse.
5. **Klicken nur als Einstieg.** Manueller Abbau bringt die ersten Erze für den ersten Bohrer.
   Danach läuft alles über die Fabrik.

---

## 2. Spielablauf

1. **Bruchlandung** auf dem Startplaneten: Erz per Klick abbauen und den ersten Bohrer bauen.
2. **Erste Kette:** Bohrer → Förderband → Schmelzofen → Lager. Platten werden zu Baumaterial.
3. **Forschung:** Datenkerne produzieren, damit neue Maschinen, Rezepte und Stufen freischalten.
4. **Builds:** Maschinentypen steigen im Level und geben Punkte für ihre Bäume. Der Kommandant
   steigt im Level und gibt Punkte für den großen Baum.
5. **Expansion:** Raketen zu neuen Planeten bauen, interplanetare Frachtrouten einrichten.
6. **Bedrohungen:** Aliens greifen an. Man baut Geschütztürme, die mit Munition aus der eigenen
   Fabrik versorgt werden, und besiegt Planeten-Bosse für einzigartige Items.
7. **Endgame:** Sprung in ein neues Sternensystem (Prestige), Paragon-Bretter, höhere
   Bedrohungsstufen.

---

## 3. Kernsysteme

### 3.1 Planeten
| Planet | Rohstoffe | Besonderheit | Bedrohung / Boss |
|---|---|---|---|
| **Kepler-Ödland** (Start) | Eisen, Kupfer, Stein, Kohle | Neutral, viel Platz | Sandkriecher / *Der Bohrwurm* |
| **Ignis** (Vulkanmond) | Schwefel, Wolfram, Lava | Geothermie-Energie, Hitze senkt Effizienz | Lavawürmer / *Magmakönigin* |
| **Cryon** (Eiswelt) | Eis, Lithium, Helium-3 | Kälte: Maschinen brauchen Heizung | Frostschwarm / *Der Gletscherkoloss* |
| **Zephyr** (Gasriese) | Wasserstoff, Plasma | Nur schwebende Plattformen, wenig Platz | Sturmgeister / *Auge des Sturms* |
| **Prisma** (Kristallwelt) | Kristalle, Seltene Erden | Resonanz: Nachbarschafts-Boni verdoppelt | Kristallkonstrukte / *Der Splitterfürst* |
| **Verdant** (Xeno-Dschungel) | Biomasse, Xeno-Proben | Vegetation wächst über Gebäude | Schwarmbrut / *Brutmutter* |
| **Die Leere** (Endgame) | Dunkle Materie, Exotische Materie | Zufällige Raster-Modifikatoren | Leerenwesen / *Der Ereignishorizont* |

- Jeder Planet hat ein eigenes Raster (Start 32×32, erweiterbar), eigene Erzfelder und ein
  eigenes Stromnetz.
- **Interplanetare Logistik:** Raketensilos und Frachtrouten mit begrenzter Kapazität verbinden
  die Planeten. Spätere Rezepte brauchen Rohstoffe von mehreren Planeten.

### 3.2 Ressourcen und Produktionsketten
| Stufe | Beispiele |
|---|---|
| T0 Rohstoffe | Eisenerz, Kupfererz, Stein, Kohle, Schwefel, Lithium … |
| T1 Verhüttung | Eisenplatte, Kupferplatte, Stahl, Ziegel, Glas |
| T2 Bauteile | Zahnrad, Kupferkabel, Schaltkreis, Stahlträger |
| T3 Komponenten | Motor, Batterie, Fortgeschrittener Schaltkreis, Kühlrippe |
| T4 Hochtechnologie | Prozessor, Robotik-Rahmen, Raketenteil, Fusionszelle |
| T5 Exotik | Quantenchip, Warp-Kern, Antimaterie-Kapsel |
| Forschung | Datenkerne (Rot, Grün, Blau, Violett, Gold), wie Science Packs |
| Militär | Munition, Plasmaladungen, Raketen |

### 3.3 Das Raster (Factorio-Teil)
- Maschinen belegen 1×1 bis 4×4 Felder, haben **Eingangs- und Ausgangsseiten** und lassen sich drehen.
- **Förderbänder** (Stufen mit steigendem Durchsatz), Weichen und Untergrundbänder. Rohre für
  Flüssigkeiten (Lava, Wasserstoff) ab Ignis.
- **Lager-Hub:** Was hineinfließt, landet im globalen Inventar des Planeten. Daraus wird gebaut.
- **Strom:** Generatoren speisen das Planeten-Netz. Bei Strommangel laufen alle Maschinen langsamer.
- Bedienung: Ziehen zum Platzieren, `R` zum Drehen, Rechtsklick zum Abreißen, Zoom und Verschieben,
  später **Blaupausen** (Bereich kopieren und einfügen).
- **Nachbarschaft:** Viele Boni wirken auf angrenzende Felder oder in einem Radius, zum Beispiel
  „+10 % Geschwindigkeit pro angrenzendem Bohrer“.

### 3.4 Maschinen
| Typ | Stufen (Beispiele) | Aufgabe |
|---|---|---|
| Bohrer | Handbohrer → Elektrobohrer → Tiefenbohrer → Plasmabohrer | Erz abbauen |
| Ofen | Steinofen → Elektroofen → Lichtbogenofen → Sternenschmiede | Verhüttung |
| Assembler | Mk I – Mk IV | Bauteile fertigen |
| Chemiewerk / Raffinerie | Mk I – Mk III | Flüssigkeiten, Kunststoffe, Treibstoff |
| Labor | Mk I – Mk III | Datenkerne verbrauchen, Forschung |
| Generator | Kohlekraftwerk, Solar, Geothermie, Fusion | Strom |
| Logistik | Bänder, Weichen, Rohre, Raketensilo | Transport |
| Verteidigung | Geschützturm, Laserturm, Plasmakanone, Schildgenerator | Bedrohungen abwehren |

Jede Maschine hat diese Werte: Geschwindigkeit, Produktivität (Bonus-Output), Krit-Produktion
(Chance auf mehrfachen Output), Energieverbrauch, Modul-Sockel und Haltbarkeit.

### 3.5 Stat-Engine
```
Endwert = (Basis + Σ Flat) × (1 + Σ Increased%) × Π (1 + More_i%)
```
- **Tags:** `Bohrer`, `Ofen`, `Assembler`, `Energie`, `Logistik`, `Verteidigung`, `Klick`,
  `Planet:Ignis`, `Ressource:Eisen`, `Stufe:T3`, Schadensarten …
- **Bedingungen:** „bei voller Stromversorgung“, „pro angrenzendem Ofen“, „während eines Angriffs“,
  „wenn das Eingangsband voll ist“.
- **Konvertierung** wie in PoE: „20 % des Stromverbrauchs werden als Hitze erzeugt“,
  „Kinetischer Schaden wird zu Plasma“.
- Werte werden nur bei Änderungen neu berechnet. Eine Aufschlüsselung im UI zeigt, woher jeder
  Wert kommt (wie Path of Building).

### 3.6 Kommandanten-Baum (global, PoE2)
- Etwa 250–350 Knoten: kleine Knoten, Notables, Keystones, Juwelsockel, Masteries.
- Punkte durch das **Kommandanten-Level** (XP aus Produktion, Forschung und Bossen).
- **Klassen** mit eigenem Startpunkt im Baum, Aszendenz ab Level 30:

| Klasse | Fokus | Aszendenz A | Aszendenz B |
|---|---|---|---|
| **Ingenieur** | Produktivität, Effizienz | *Chefkonstrukteur* | *Effizienz-Purist* |
| **Prospektor** | Abbau, Planeten, Erzfelder | *Tiefenschürfer* | *Planetenbrecher* |
| **Logistiker** | Bänder, Fracht, Platz | *Netzwerkarchitekt* | *Frachtbaron* |
| **Kriegsherr** | Verteidigung, Bosse | *Festungsmeister* | *Orbitalkommandant* |
| **Quantentechniker** | Aktive Skills, Energie | *Zeitweber* | *Leerenrufer* |

- **Beispiel-Keystones:**
  - *Monokultur:* Nur der häufigste Maschinentyp eines Planeten arbeitet, dieser aber mit 150 % more Geschwindigkeit.
  - *Überlastnetz:* Strommangel verlangsamt nicht mehr, sondern beschädigt Maschinen. Dafür 50 % more Geschwindigkeit.
  - *Schwarmlogik:* Maschinen ohne angrenzende gleiche Maschine produzieren nichts. Jeder gleiche Nachbar gibt 25 % more.
  - *Kein Abfall:* Produktivität ist 0. Krit-Produktion verdreifacht stattdessen den Output.
  - *Eiserne Disziplin:* Keine Module mehr möglich. Jeder leere Sockel gibt 30 % more Produktivität.

### 3.7 Maschinenbäume (pro Maschinentyp)
- Jeder Maschinentyp (Bohrer, Ofen, Assembler, Labor, Generator, Turm …) hat einen eigenen Baum
  mit 40–80 Knoten.
- Der **Maschinentyp levelt** durch Produktion (z. B. jedes geförderte Erz gibt Bohrer-XP).
  Jedes Level gibt einen Punkt.
- Die Knoten gelten für alle Maschinen dieses Typs auf allen Planeten. Respec kostet Ressourcen.
- **Beispiel Bohrer-Baum:**
  - Klein: +8 % Abbaugeschwindigkeit, −5 % Energieverbrauch
  - Notable *Resonanzbohrung:* +12 % Geschwindigkeit pro angrenzendem Bohrer
  - Notable *Tiefe Adern:* 10 % Chance, zusätzlich ein Erz einer höheren Stufe zu fördern
  - Keystone *Überlastbohrer:* 100 % more Geschwindigkeit, fällt alle 60 s für 5 s aus
  - Keystone *Planetenkern:* Bohrer ignorieren Erzfelder und fördern überall, aber 40 % less Geschwindigkeit
- **Beispiel Ofen-Baum:** *Abwärmenutzung* (Öfen versorgen angrenzende Maschinen mit Strom),
  *Legierungsmeister* (Stahl-Rezept ohne Zwischenschritt).

### 3.8 Module, Loot und Crafting (PoE/D4 trifft Factorio)
- Maschinen haben **Modul-Sockel**. Module haben Grundtypen: Geschwindigkeit, Produktivität,
  Effizienz, Krit, Verteidigung.
- **Seltenheit:** Normal → Verbessert (2 Affixe) → Selten (4–6) → Legendär (Aspekt) → Einzigartig.
- **Affixe** als Präfix und Suffix, mit Tiers und Item-Level, zum Beispiel
  „+18 % Geschwindigkeit für Öfen“ oder „+1 Output bei Krit-Produktion“.
- **Quellen:** Meteoriten, Bedrohungen, Bosse, Forschungsmeilensteine, Planeten-Expeditionen.
- **Crafting-Währung:**

| Währung | Analog | Effekt |
|---|---|---|
| Kalibrierchip | Transmutation | Normal → Verbessert |
| Erweiterungskern | Augmentation | +1 Affix |
| Fusionskatalysator | Alchemy | → Selten |
| Chaos-Plasma | Chaos | Seltenes Modul neu würfeln |
| Quanten-Feinjustierung | Divine | Werte innerhalb der Tiers neu würfeln |
| Annullierungsfeld | Annulment | Zufälliges Affix entfernen |
| Singularitätskern | Exalted | +1 Affix auf Selten |
| Härtung | Tempering (D4) | Gezieltes Zusatz-Affix |
| Meisterkalibrierung | Masterwork (D4) | Affix-Werte stufenweise verstärken |

- **Artefakte:** wenige globale Slots für Uniques, die den ganzen Build verändern.

### 3.9 Bedrohungen und Bosse
- **Angriffswellen** kommen in Abständen vom Rand des Rasters und greifen Gebäude an.
- **Geschütztürme** brauchen Munition aus der eigenen Fabrik. Verteidigung ist also selbst eine
  Produktionskette.
- **Schadensarten** wie Elemente in PoE: Kinetisch, Thermisch, EM, Plasma, Leere. Gegner haben
  Resistenzen und Statuseffekte (Brand, Kälte, Schock, Zersetzung).
- **Planeten-Bosse** mit Lebensleiste, Phasen und Mechaniken. Zum Beispiel lässt die Magmakönigin
  Lava über Raster-Felder fließen, und der Gletscherkoloss friert Maschinen ein.
- **Bedrohungsstufen** wie die Waystones in PoE2 (Stufe 1–16): Signalbaken mit Modifikatoren
  („Gegner +40 % Plasma-Resistenz“, „Bänder 20 % langsamer“). Mehr Modifikatoren bringen mehr Loot.

### 3.10 Boss-spezifische Items
Jeder Boss hat eine eigene Beutetabelle mit Uniques, die nur bei ihm droppen:

| Boss | Item | Effekt |
|---|---|---|
| Der Bohrwurm | *Zahn des Bohrwurms* (Modul) | Bohrer fördern 2 Erz pro Zyklus, verbrauchen aber doppelt Strom |
| Magmakönigin | *Herz der Magmakönigin* (Artefakt) | Öfen brauchen keinen Strom, wenn sie an Lava angrenzen |
| Gletscherkoloss | *Ewiges Eis* (Modul) | Maschine überhitzt nie; +50 % Geschwindigkeit, wenn Nachbarn heiß sind |
| Auge des Sturms | *Sturmkern* (Artefakt) | Förderbänder doppelt so schnell; Weichen verteilen zufällig |
| Splitterfürst | *Prismensplitter* (Juwel) | Nachbarschafts-Boni im Radius 2 statt 1 |
| Brutmutter | *Lebende Legierung* (Modul) | Maschine repariert sich selbst und gibt angrenzenden Maschinen +1 Modul-Sockel |
| Ereignishorizont | *Singularität* (Artefakt) | Ein Raster-Feld zählt als angrenzend zu allen Maschinen des Planeten |

Dazu bossspezifische Crafting-Materialien, zum Beispiel *Magma-Essenz*, die ein garantiertes
Ignis-Affix auf ein Modul setzt.

### 3.11 Aktive Skills (Kommandant)
- Hotbar mit 6 Slots (Tasten 1–6), Ressource **Energie-Reserve**, Cooldowns.
- **Skills:**
  - *Überladung:* Maschinen in einem Bereich +200 % Geschwindigkeit für 10 s
  - *Orbitalschlag:* Großer Schaden in einem Bereich
  - *Meteoritenruf:* Ein Meteorit mit seltenen Erzen und Loot schlägt ein (ersetzt den goldenen Keks)
  - *Zeitdilatation:* Ein Planet läuft 30 s doppelt so schnell
  - *Drohnenschwarm:* Repariert Gebäude und sammelt Loot ein
  - *Notstrom:* Füllt das Stromnetz sofort auf
- **Erweiterungschips** wie die Support-Gems in PoE2: *Größerer Radius*, *Längere Dauer*,
  *Kettenreaktion*, *Auslöser bei Krit-Produktion*, *Echo*, *Effizienz*.
- **Meteoriten** schlagen auch zufällig ein. Wer sie anklickt, bekommt Erze, Buffs oder Loot.

### 3.12 Prestige und Paragon
- **Paragon** ab Kommandanten-Level 100: Paragon-Bretter mit Glyphen wie in D4.
- **Prestige „Sternensprung“:** Planeten und Fabriken werden zurückgesetzt, dafür gibt es
  **Dunkle Energie** für einen eigenen Meta-Baum. Kommandanten-Level, Maschinen-Level, Module und
  Artefakte bleiben. Jedes neue Sternensystem hat zufällige Planeten-Modifikatoren.
- **Prestige-Ebene 2** (später): größerer Reset mit neuen Klassen, Keystones und Planetentypen.

### 3.13 Build-Management
- **Loadouts:** Baum-Konfigurationen und Modul-Sätze speichern und wechseln, zum Beispiel ein
  Produktions-Setup und ein Boss-Setup.
- **Build-Codes** zum Teilen sowie **Blaupausen-Codes** für Fabrik-Layouts.
- Statistiken: Produktionsraten pro Ressource (Diagramme), Engpass-Anzeige, Herkunft aller Modifier.

---

## 4. Technik

**Stack:** Vite + TypeScript + React für Menüs und Panels, **Canvas 2D** für das Raster (bei
Bedarf später PixiJS), `break_infinity.js` für große Zahlen, Vitest für Tests.

### Wichtigste Architekturentscheidung: Fluss-Simulation statt einzelner Items
Bei riesigen Zahlen kann man nicht jedes Erz einzeln über ein Band schieben. Deshalb gilt:
- Das Raster definiert einen **Produktionsgraphen**: Maschinen sind Knoten, Bänder und Rohre sind
  Kanten mit einem Durchsatz-Limit.
- Ein **Fluss-Löser** berechnet daraus die Raten jeder Maschine im Gleichgewicht: Was kommt rein,
  was geht raus, wo staut es, wo fehlt Strom. Er läuft nur, wenn sich das Layout oder die Werte ändern.
- Pro Tick werden nur Raten × Zeit verrechnet. Das ist schnell und macht **Offline-Fortschritt
  exakt** möglich.
- Die Items auf den Bändern werden passend zur Rate **nur animiert**. Engpässe werden rot markiert.

### Was vom bisherigen Code bleibt
- **Bleibt:** Game-Loop, große Zahlen, Zahlenformat, Event-Bus, Zufallsgenerator, Speichern mit
  Migrationen, Offline-Rahmen, Tooltips, Optionen und Export/Import.
- **Wird ersetzt:** Keks-Inhalte (Gebäude, Upgrades, goldener Keks) und die Bäckerei-Oberfläche.
- Alte Keks-Spielstände werden nicht übernommen (Speicherformat Version 2).

### Ordnerstruktur
```
src/
  core/        Loop, Events, RNG, BigNumber, Format, Save, Migrationen
  engine/      Stat-Engine: Modifier, Tags, Bedingungen, Aufschlüsselung
  sim/         Raster, Produktionsgraph, Fluss-Löser, Strom, Planeten-Tick, Offline
  systems/     research, machines, trees, commander, modules, crafting,
               threats, combat, bosses, skills, logistics, prestige, paragon
  data/        resources, recipes, machines, planets, research, trees/*.json,
               affixes, uniques, bosses, skills, currency
  ui/          App-Rahmen, Panels, Tooltips
  ui/grid/     Canvas-Renderer, Kamera, Bau-Werkzeuge, Sprites, Band-Animation
  ui/tree/     Canvas-Renderer für Skilltrees (Kommandant + Maschinen)
tools/         Baum-Editor, Balancing-Simulation
tests/
```

---

## 5. Umsetzungsphasen

| Phase | Inhalt | Ergebnis |
|---|---|---|
| ✅ **0 – Fundament** | Loop, BigNumber, Speichern, Events | Steht bereits |
| ✅ **1 – Sci-Fi-Umbau** | Keks-Inhalt entfernen, mehrere Ressourcen, Inventar, Startplanet, Abbau per Klick, Sci-Fi-Oberfläche | Neues Theme, erste Erze |
| ✅ **2 – Raster und Bauen** | Canvas-Raster, Kamera, Bohrer/Ofen/Band/Lager platzieren, drehen, abreißen, Baukosten | Erste Fabrik baubar |
| ✅ **3 – Produktions-Simulation** | Produktionsgraph, Fluss-Löser, Bänder mit Durchsatz, Rezepte, Strom, Band-Animation, Offline | Laufende Fabrik |
| ✅ **4 – Stat-Engine** | Modifier, Tags, Bedingungen, Nachbarschaft, Aufschlüsselung | Alle Werte laufen über die Engine |
| ✅ **5 – Forschung und Stufen** | Datenkerne, Labore, Forschungsbaum, Maschinenstufen, Ketten bis T3 | Fortschritt durch Technik |
| ✅ **6 – Maschinenbäume** | Maschinen-Level, Bäume für Bohrer, Ofen, Assembler und Generator, Respec | Erste echte Builds |
| ✅ **7 – Kommandant** | Kommandanten-Level, Klassen, globaler Baum (Canvas), Keystones | Build-Tiefe wie in PoE2 |
| ✅ **8 – Planeten und Logistik** | Ignis und Cryon, Umweltbedingungen, Raketen, Frachtrouten | Mehrere Welten |
| ✅ **9 – Module und Crafting** | Modul-Sockel, Loot, Affixe, Währungen, Artefakte, Meteoriten | Loot-Schleife |
| ✅ **10 – Bedrohungen und Bosse** | Wellen, Türme, Munition, Schadensarten, Bosse, Boss-Items, Bedrohungsstufen | Kampf- und Boss-Builds |
| ✅ **11 – Aktive Skills** | Hotbar, Energie-Reserve, Skills, Erweiterungschips | Aktives Spiel |
| ✅ **12 – Endgame** | Restliche Planeten, Sternensprung (Prestige), Dunkle Energie, Paragon | Langzeitmotivation |
| ✅ **13 – Feinschliff** | Blaupausen, Loadouts, Build-Codes, Statistik-Diagramme, Sound, Balancing | Release-fähig |

Jede Phase endet spielbar und getestet.
