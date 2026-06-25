# Coolify-Deployment — Schritt für Schritt

Deployment der GA-BA-Regiebericht-App auf deinem eigenen Coolify-Server.
Geschätzte Dauer: ~20–30 Minuten.

---

## Voraussetzungen

- Coolify läuft auf deinem Server und ist im Browser erreichbar.
- Eine (Sub-)Domain, die auf deinen Server zeigt, z. B. `regie.gaba-ag.ch`
  (A-Record auf die Server-IP). Ohne Domain geht es auch über `http://IP:Port`.
- Der Ordner `gaba-regie/` liegt in einem **Git-Repository** (GitHub/GitLab/Gitea
  oder Coolifys eigener Git). Coolify deployt aus Git.

---

## Schritt 0 — Code nach Git bringen

Falls noch nicht geschehen, das Projekt in ein Repo pushen:

```bash
cd gaba-regie
git init
git add .
git commit -m "GA BA Regiebericht MVP"
git branch -M main
git remote add origin <DEINE_REPO_URL>
git push -u origin main
```

> Wichtig: `.env` wird durch `.gitignore` **nicht** mitgepusht — Secrets setzt
> du später direkt in Coolify. Das ist gewollt.

---

## Schritt 1 — Projekt anlegen

1. In Coolify oben links **+ New** → **Project**.
2. Name z. B. `GA BA Regie`. Environment `production` belassen.

---

## Schritt 2 — PostgreSQL-Datenbank hinzufügen

1. Im Projekt **+ New Resource** → **Database** → **PostgreSQL**.
2. Version 16 wählen, anlegen, **Start** klicken.
3. Im DB-Tab den **internen Connection-String** kopieren (Feld
   *Postgres URL (internal)* — beginnt mit `postgres://...`). Diesen Wert
   brauchst du gleich als `DATABASE_URL`.

> Der **interne** String (nicht der öffentliche) wird verwendet, weil App und
> DB im selben Coolify-Projekt laufen und über das interne Netzwerk reden.

---

## Schritt 3 — Anwendung anlegen (Dockerfile)

1. Im Projekt **+ New Resource** → **Application** → **Public/Private Repository**
   (je nach Repo), Git verbinden, dein Repo auswählen.
2. **Build Pack:** `Dockerfile`.
3. **Base Directory:** `/gaba-regie`
   (falls das Repo den Ordner enthält; liegt das Projekt im Repo-Root, dann `/`).
4. **Dockerfile Location:** `Dockerfile` (wird automatisch erkannt).
5. **Branch:** `main`.
6. Speichern — aber **noch nicht deployen**, zuerst Env + Storage + Domain setzen.

---

## Schritt 4 — Umgebungsvariablen setzen

Im App-Tab **Environment Variables** folgende Werte anlegen
(Build-time muss nicht angehakt sein, Runtime genügt):

| Variable | Wert |
|----------|------|
| `DATABASE_URL` | *(interner Postgres-String aus Schritt 2)* |
| `AUTH_SECRET` | zufälliger String, lokal erzeugt mit `openssl rand -base64 32` |
| `AUTH_URL` | `https://regie.gaba-ag.ch` *(deine Domain, exakt)* |
| `SEED_ADMIN_EMAIL` | `admin@gaba-ag.ch` |
| `SEED_ADMIN_PASSWORD` | ein sicheres Start-Passwort |
| `UPLOAD_DIR` | `/app/uploads` |
| `SMTP_DRY_RUN` | `true` *(vorerst; E-Mails werden nur protokolliert)* |
| `SMTP_HOST` | *(später, z. B. `asmtp.mail.hostpoint.ch` o. Ä.)* |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | *(SMTP-Login)* |
| `SMTP_PASS` | *(SMTP-Passwort)* |
| `SMTP_FROM` | `Gandola & Battaini AG <info@gaba-ag.ch>` |

> Solange kein echter SMTP-Zugang hinterlegt ist, `SMTP_DRY_RUN=true` lassen.
> Der Versand funktioniert dann technisch (Status „Gesendet"), verschickt aber
> noch keine echte Mail — ideal zum Testen. Für echten Versand `SMTP_*`
> ausfüllen und `SMTP_DRY_RUN` auf `false`.

---

## Schritt 5 — Persistenter Speicher für Fotos

Damit Baustellenfotos einen Container-Neustart überleben:

1. App-Tab **Persistent Storage** → **+ Add**.
2. **Name:** `uploads`
3. **Source Path (Host):** z. B. `/data/gaba-regie/uploads`
   *(beliebiger absoluter Pfad auf dem Server)*
4. **Destination Path (Container):** `/app/uploads`
5. Speichern.

---

## Schritt 6 — Domain, Port & SSL

1. App-Tab **General** → **Domains:** `https://regie.gaba-ag.ch` eintragen.
2. **Ports Exposes:** `3000` (die App lauscht intern auf Port 3000).
3. Coolify stellt automatisch ein Let's-Encrypt-Zertifikat aus (sofern die
   Domain auf den Server zeigt).

---

## Schritt 7 — Deploy

1. Oben rechts **Deploy** klicken.
2. Im **Logs**-Tab den Build verfolgen. Der erste Build dauert einige Minuten
   (Playwright/Chromium-Image + `npm ci` + `next build`).
3. Beim Start wird automatisch `prisma db push` ausgeführt → die Tabellen werden
   in der Datenbank angelegt. Danach startet Next.js.
4. Wenn der Status **Running** ist, ist die App unter deiner Domain erreichbar.

---

## Schritt 8 — Erst-Einrichtung (einmalig)

Nach dem ersten erfolgreichen Deploy zwei Dinge erledigen:

### a) Admin-Benutzer anlegen

Im App-Tab **Terminal** (oder **Execute Command**) im laufenden Container:

```bash
npm run db:seed
```

Das legt den Admin aus `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` an, dazu die
2025-Lohnansätze und Beispiel-Mitarbeiter.

### b) Artikelkatalog importieren

Am einfachsten **über die App-Oberfläche**:

1. Einloggen (siehe Schritt 9).
2. Menü **Import** öffnen.
3. Datei `Gesamte Liste.xlsx` hochladen → **Import starten**.
   (~2300 Artikel werden übernommen.)

> Alternativ per Terminal, falls die Datei auf dem Server liegt:
> `npm run import:resources -- "/pfad/zu/Gesamte Liste.xlsx"`

---

## Schritt 9 — Login & Passwort ändern

1. `https://regie.gaba-ag.ch` öffnen.
2. Mit `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` anmelden.
3. Empfehlung: Start-Passwort zeitnah ändern (bzw. weitere Benutzer anlegen —
   im MVP via Seed/DB; eine Benutzerverwaltung kann später ergänzt werden).

---

## Schritt 10 — Updates ausrollen

Bei Code-Änderungen einfach nach Git pushen und in Coolify **Deploy** klicken
(oder **Auto-Deploy on push** im App-Tab **Webhooks** aktivieren). `prisma db push`
gleicht das DB-Schema bei jedem Start automatisch ab.

---

## Troubleshooting

| Symptom | Ursache / Lösung |
|---------|------------------|
| Build bricht bei `next build` mit TypeScript-Fehler ab | Fehlermeldung kopieren und mir schicken — meist 1–2 Zeilen Anpassung. |
| App startet, aber „Can't reach database" | `DATABASE_URL` prüfen (interner String, Postgres läuft, gleiches Projekt). |
| Login schlägt fehl | `npm run db:seed` ausgeführt? `AUTH_SECRET` und `AUTH_URL` gesetzt? |
| PDF leer / Fehler | Image basiert auf Playwright (Chromium vorhanden) — bei Bedarf Logs prüfen. |
| Fotos weg nach Redeploy | Persistent Storage `/app/uploads` korrekt gemountet (Schritt 5)? |
| E-Mail kommt nicht an | `SMTP_DRY_RUN=true`? Auf `false` setzen und `SMTP_*` korrekt ausfüllen. |

---

## Sicherheits-Hinweise

- `AUTH_SECRET` geheim halten, nicht ins Git.
- Start-Passwort nach dem ersten Login ändern.
- Postgres nicht öffentlich exponieren (internen String nutzen).
- Backups: Coolify kann für die Postgres-Ressource automatische Backups einrichten
  (DB-Tab → **Backups**). Empfohlen.

---

*Quellen zur aktuellen Coolify-Funktionsweise: Coolify-Doku & Tutorials —
siehe Links in der zugehörigen Chat-Nachricht.*
