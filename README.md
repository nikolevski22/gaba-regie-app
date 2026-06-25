# GA BA Regieberichte

Web-App zur Erfassung, Berechnung, PDF-Erstellung und zum Versand von Regieberichten
für die Gandola & Battaini AG. Ersetzt das bisherige Excel-System
(`Rap_Vorlage 2025.xltm` + `Gesamte Liste.xlsx`).

## Stack

Next.js 15 (App Router, TS) · PostgreSQL · Prisma · Auth.js · Tailwind ·
SheetJS (Excel-Import) · Playwright (PDF) · Nodemailer (E-Mail).

## Lokales Setup

```bash
cd gaba-regie
cp .env.example .env          # Werte ausfüllen (DATABASE_URL, AUTH_SECRET ...)
npm install
npx prisma migrate dev        # Schema -> DB
npm run db:seed               # Admin + 2025-Ansätze + Beispiel-Mitarbeiter
npm run import:resources -- "../Gesamte Liste.xlsx"   # ~2300 Artikel importieren
npm run dev                   # http://localhost:3000
```

Login mit `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` aus der `.env`.

## Tests

```bash
npm test     # Berechnung gegen Beispiel 1 & 2 verifiziert (calc.test.ts)
```

## Deployment auf Coolify (eigener Server)

1. Neues **Dockerfile-basiertes** Projekt in Coolify, dieses Repo/Verzeichnis als Quelle.
2. **PostgreSQL** als Coolify-Ressource anlegen, `DATABASE_URL` als Env setzen.
3. Weitere Env-Variablen aus `.env.example` setzen (`AUTH_SECRET`, `AUTH_URL`, `SMTP_*`).
4. **Persistentes Volume** auf `/app/uploads` mounten (Baustellenfotos).
5. Deploy. Der Container führt beim Start automatisch `prisma migrate deploy` aus.
6. Einmalig den Artikelkatalog importieren (Coolify-Terminal oder `/import`-Seite):
   `npm run import:resources -- "/pfad/zur/Gesamte Liste.xlsx"`.

Das Dockerfile basiert auf dem Playwright-Image (Chromium für PDF inklusive).
Railway funktioniert identisch (Dockerfile-Deploy + Postgres-Plugin + Volume).

## Projektstruktur

```
src/
  auth.ts                 Auth.js (Credentials-Login)
  middleware.ts           Routen-Schutz
  lib/
    calc.ts               Berechnungslogik (Quelle der Wahrheit)
    calc.test.ts          Vergleichstests vs. Beispiel-PDFs
    import.ts             Excel-Parser + Kategorisierung + 2025-Ansätze
    prisma.ts             Prisma-Client
    utils.ts
  app/
    login/                Login
    (app)/                Geschützter Bereich (Nav-Shell)
      dashboard/          Rapport-Übersicht
      reports/            Erfassung + Vorschau + PDF + Versand   [in Arbeit]
      collections/        Sammelrapporte (ZS/TOTAL)             [in Arbeit]
      stammdaten/         Artikel- & Mitarbeiter-CRUD           [in Arbeit]
      import/             Excel-Import-UI                       [in Arbeit]
prisma/
  schema.prisma           Datenmodell
  seed.ts                 Admin + Ansätze + Mitarbeiter
scripts/
  import-resources.ts     CLI-Import des Artikelkatalogs
```

## Berechnungslogik (verbindlich)

```
Total brutto = Σ (Anzahl × Preis)
Rabatt       = brutto × rabatt%
Skonto       = (brutto − Rabatt) × skonto%
Allg. Abzug  = (brutto − Rabatt − Skonto) × abzug%
MwSt-Basis   = brutto − Rabatt − Skonto − Abzug
MwSt         = MwSt-Basis × 8.1 %
Netto        = MROUND(MwSt-Basis + MwSt, 0.05)
```

Verifiziert gegen `Beispiel 1.pdf` (Brutto 3'346.92) und
`Beispiel 2.pdf` (MwSt 1'393.91, Netto 18'602.65).

## Umsetzungsstand

- [x] Datenmodell, Setup, Auth, Login, Dashboard
- [x] Berechnungs-Engine + Vergleichstests (gegen Beispiel 1 & 2)
- [x] Excel-Import (CLI + UI) — 2308 Artikel verifiziert
- [x] Stammdaten-CRUD (Artikel, Mitarbeiter)
- [x] Rapport-Erfassung mit Live-Berechnung & Foto-Upload
- [x] PDF-Generierung (pixelgenau, Playwright) — Layout visuell verifiziert
- [x] E-Mail-Versand mit PDF + Versand-Historie (Dry-Run im MVP)
- [x] Status-Workflow (Entwurf/Gesendet/Unterzeichnet/Abgerechnet)
- [x] Sammelrapporte (ZS) mit eigenem PDF + Versand

### Hinweis zur Verifikation

Verifiziert wurden: Berechnung (11 Tests grün), Excel-Import (2308 Artikel),
und PDF-Layout (Report-Brutto 3'346.92 = Beispiel 1; Sammelrapport-Kaskade).
Ein vollständiger `npm run build` sollte einmalig lokal ausgeführt werden —
melde allfällige Typ-/Build-Meldungen, sie sind schnell behoben.

### Bekannte Punkte für die nächste Runde

- Einige Material-Artikel tragen `3.042`/`6.032`-Präfixe und landen in
  "Maschine"/"Entsorgung" — im Artikel-CRUD korrigierbar.
- Rapport-Nr. wird manuell erfasst (Basis + Suffix, mehrere Suffixe pro Basis).
- SMTP ist im Dry-Run (`SMTP_DRY_RUN=true`); echte Zugangsdaten in `.env` setzen.
- Kunden/Projekte sind als Freitext im Rapport gelöst (Customer/Project-Tabellen
  vorhanden, eigenes CRUD optional später).
```
