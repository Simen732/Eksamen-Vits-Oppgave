# JokeRater App 😂

En fullstack webapplikasjon for å vurdere og rangere morsomme vitser! Brukere kan lese vitser, gi dem karakterer, og se hvilke vitser som scorer høyest. Applikasjonen støtter både registrerte og anonyme brukere, med personlige profiler og sanntidsoppdateringer.

## 📋 Prosjektstruktur

```
c:\Skole\Eksamen\Eksamen_2025\
├── models/
│   ├── User.js          # Brukermodell med autentisering og profil
│   └── Joke.js          # Vitsemodell med vurderinger
├── routes/
│   ├── auth.js          # Autentiseringsruter (login/register)
│   ├── joke.js          # Vitsruter og vurdering
│   ├── leaderboard.js   # Topplister og statistikk
│   └── profile.js       # Brukerprofilstyring
├── middleware/
│   └── auth.js          # JWT-autentisering middleware
├── public/
│   ├── css/
│   │   └── style.css    # Styling og animasjoner
│   ├── js/
│   │   └── main.js      # Frontend logikk og Socket.IO
│   └── uploads/         # Profilbilder
├── views/               # EJS-templates
│   ├── layout.ejs       # Hovedlayout
│   ├── index.ejs        # Hjemmeside
│   ├── faq.ejs          # FAQ-side
│   └── auth/            # Autentiseringssider
├── server.js           # Hovedserver med Express og Socket.IO
└── package.json        # Prosjektavhengigheter
```

## 🚀 Hovedfunksjoner

### Vitsevurdering
- Les tilfeldige vitser fra databasen
- Gi karakterer fra 1-5 stjerner
- Se gjennomsnittsvurderinger og totalt antall stemmer
- Sanntidsoppdateringer av vurderinger

### Brukerautentisering
- Registrering med brukernavn, e-post og passord
- Sikker innlogging med JWT-tokens
- Passordhashing med Argon2
- Personlig profil med statistikk og profilbilder
- Vurderingshistorikk

### Topplister og Statistikk
- Leaderboard med best vurderte vitser
- Topp 5 vitser på forsiden
- Brukerstatistikk på profilsider
- Sanntidsoppdateringer av rangeringer

## 🛠️ Teknologier

### Backend
- **Node.js** med Express.js
- **MongoDB** med Mongoose ODM
- **Socket.IO** for sanntidskommunikasjon
- **JWT** for autentisering
- **Argon2** for passordhashing
- **Multer** for filopplasting (profilbilder)

### Frontend
- **EJS** templating engine
- **Vanilla JavaScript** for interaktivitet
- **Socket.IO Client** for sanntidsoppdateringer
- **CSS** med Google Fonts (Inter)

### Sikkerhet
- **Helmet.js** for sikkerhetshoder
- **Express Rate Limit** for ratebegrensning
- **Express Validator** for input-validering

## 📦 Installasjon og oppsett

### Forutsetninger
- Node.js (versjon 14+)
- MongoDB (lokal eller cloud)
- Git

### Trinn-for-trinn setup

1. **Klon prosjektet**
```bash
git clone <repository-url>
cd Skole/Eksamen/Eksamen_2025
```

2. **Installer avhengigheter**
```bash
npm install
```

3. **Opprett miljøvariabler**
Opprett en `.env` fil i rotmappen:
```env
JWT_SECRET=din_hemmelige_jwt_nøkkel_her
MONGODB_URI=mongodb://localhost:27017/foxvoting
PORT=3000
```

4. **Start MongoDB**
Sørg for at MongoDB kjører lokalt eller konfigurer cloud-tilkobling.

5. **Start applikasjonen**
```bash
# Utviklingsmodus med nodemon
npm run dev

# Produksjonsmodus
npm start
```

6. **Åpne i nettleser**
Gå til `http://localhost:3000`

## 🔧 API-endepunkter

### Vitser (`/joke`)
- `GET /joke/random` - Hent tilfeldig vits
- `POST /joke/rate/:jokeId` - Vurder en vits
- `GET /joke/category/:category` - Hent vitser per kategori

### Leaderboard (`/leaderboard`)
- `GET /leaderboard` - Toppliste over best vurderte vitser
- `GET /leaderboard/api/top-jokes` - API for topp vitser

### Profil (`/profile`)
- `GET /profile` - Brukerens profilside
- `POST /profile/upload` - Last opp profilbilde
- `PUT /profile/update` - Oppdater profilinformasjon

### Autentisering (`/auth`)
- `GET /auth/register` - Registreringsside
- `POST /auth/register` - Opprett ny bruker
- `GET /auth/login` - Innloggingsside
- `POST /auth/login` - Logg inn bruker
- `POST /auth/logout` - Logg ut bruker

## 🔄 Dataflyt

1. **Vitsevurdering**:
   - Frontend henter tilfeldig vits fra `/joke/random`
   - Bruker gir karakter (1-5 stjerner)
   - POST-request til `/joke/rate/:jokeId`
   - Backend oppdaterer database og beregner ny gjennomsnittscore
   - Socket.IO sender sanntidsoppdatering til alle klienter

2. **Autentisering**:
   - Bruker registrerer/logger inn via `/auth` ruter
   - JWT-token lagres som httpOnly cookie
   - Middleware validerer token på beskyttede ruter

3. **Profilstyring**:
   - Opplasting av profilbilder via Multer middleware
   - Lagring i `/public/uploads/profiles/` mappe
   - Automatisk opprettelse av upload-mappe ved oppstart

## ⚠️ Potensielle sikkerhetsrisikoer

### 1. Mangelfull ratebegrensning på vurderinger
**Problem**: Rate limiting er satt til svært høye verdier (2500 requests per 5 timer, 250 votes per 30 min).
**Risiko**: Brukere kan fortsatt spamme vurderinger og manipulere resultater.
**Løsning**: Reduser ratebegrensninger til mer realistiske verdier, f.eks. 10 vurderinger per 10 minutter.

### 2. Usikre cookie-innstillinger for HTTP
**Problem**: Applikasjonen tvinger HTTP og deaktiverer HTTPS-sikkerhetsfunksjoner.
**Risiko**: JWT-tokens kan fanges opp på usikre nettverk.
**Løsning**: Implementer HTTPS i produksjon og fjern HTTP-tvingingen.

### 3. Utilstrekkelig validering av filopplasting
**Problem**: Manglende streng validering av profilbilder som lastes opp.
**Risiko**: Ondsinnet kode kan lastes opp som bildefiler.
**Løsning**: Implementer filtype-validering, størrelsesbegrensninger og virusscanning.

### 4. Åpen tilgang til upload-mappe
**Problem**: Upload-mappen opprettes med 755-tillatelser.
**Risiko**: Potensielt utføring av opplastede filer.
**Løsning**: Lagre filer utenfor web root eller implementer strengere tilgangskontroll.

## 🧪 Testing

For å teste applikasjonen:

1. **Registrer en ny bruker** og verifiser at autentisering fungerer
2. **Test vitsevurdering** både som registrert og anonym bruker
3. **Last opp profilbilde** og sjekk at det vises korrekt
4. **Sjekk leaderboard** og verifiser at rangeringer stemmer
5. **Test sanntidsoppdateringer** ved å åpne flere nettleserfaner
6. **Sjekk ratebegrensning** ved å gjøre mange forespørsler raskt

## 🤝 Bidrag

Bidrag er velkommen! Vennligst:
1. Fork prosjektet
2. Opprett en feature branch
3. Commit endringene dine
4. Push til branchen
5. Åpne en Pull Request

## 📄 Lisens

Dette prosjektet er en eksamenoppgave. Kontakt prosjekteier for lisensdetaljer.

---

Utviklet som del av et webapplikasjonsoppgave 🎓
