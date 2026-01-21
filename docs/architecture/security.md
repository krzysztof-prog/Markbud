# Security Model

> Dokumentacja modelu bezpieczenstwa systemu AKROBUD.

---

## Authentication

**Metoda:** JWT tokens

### Przeplyw autentykacji

```
┌───────────┐
│  User     │
│  Login    │
└─────┬─────┘
      │
      │ POST /auth/login { email, password }
      ▼
┌───────────────────┐
│  Backend          │
│  - Verify password│
│  - Generate JWT   │
└─────┬─────────────┘
      │
      │ Set httpOnly cookie
      ▼
┌───────────────────┐
│  Browser          │
│  (cookie stored)  │
└─────┬─────────────┘
      │
      │ Subsequent requests
      │ (cookie auto-sent)
      ▼
┌───────────────────┐
│  Backend          │
│  - Validate JWT   │
│  - Extract user   │
└───────────────────┘
```

### JWT Token

```typescript
// Token payload
interface JWTPayload {
  userId: number;
  email: string;
  role: UserRole;
  iat: number;  // issued at
  exp: number;  // expiration
}

// Token generation
const token = jwt.sign(
  { userId: user.id, email: user.email, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);
```

### Cookie configuration

```typescript
reply.setCookie('token', token, {
  httpOnly: true,    // Nie dostepny z JavaScript
  secure: true,      // Tylko HTTPS (w produkcji)
  sameSite: 'strict', // Ochrona przed CSRF
  maxAge: 7 * 24 * 60 * 60 // 7 dni
});
```

---

## Authorization

**Model:** Role-based Access Control (RBAC)

### Role

| Rola | Opis | Uprawnienia |
|------|------|-------------|
| `admin` | Administrator | Pelny dostep |
| `user` | Uzytkownik | Read/write orders, deliveries |
| `viewer` | Podglad | Read-only |

### Middleware autoryzacji

```typescript
// middleware/authorize.ts
export function authorize(allowedRoles: UserRole[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const user = req.user; // Set by auth middleware

    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }
  };
}

// Uzycie w route
app.delete('/orders/:id', {
  preHandler: authorize(['admin']),
  handler: orderHandler.delete
});
```

---

## Data Validation

Walidacja odbywa sie na 3 poziomach:

### 1. Frontend - React Hook Form + Zod

```typescript
// Walidacja formularza przed wyslaniem
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(createOrderSchema)
});
```

### 2. Backend - Zod schemas w handlers

```typescript
// Walidacja w handlerze
export async function create(req: FastifyRequest, reply: FastifyReply) {
  const data = createOrderSchema.parse(req.body);
  // Jesli walidacja nie przejdzie, ZodError jest rzucony
  // i przechwycony przez error handler middleware
}
```

### 3. Database - Prisma constraints

```prisma
model Order {
  id          Int      @id @default(autoincrement())
  orderNumber String   @unique  // Unikalnosc na poziomie DB
  valuePln    Int      @default(0)  // Nie moze byc null

  @@index([status, orderDate])
}
```

---

## SQL Injection Protection

Prisma ORM automatycznie escapuje zapytania:

```typescript
// Bezpieczne - Prisma escapuje parametry
const order = await prisma.order.findFirst({
  where: { orderNumber: userInput }
});

// NIE ROB TEGO - raw query bez escapowania
// const result = await prisma.$queryRaw`SELECT * FROM orders WHERE orderNumber = ${userInput}`;
```

---

## XSS Protection

### Next.js auto-escaping

React automatycznie escapuje wartosci w JSX:

```tsx
// Bezpieczne - React escapuje
<div>{userInput}</div>

// Niebezpieczne - unikaj jesli mozliwe
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

### CSP Headers

Content Security Policy w Next.js:

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline';"
  }
];
```

### Input Sanitization

Dla danych wyswietlanych w kontekstach specjalnych:

```typescript
import DOMPurify from 'dompurify';

// Sanityzacja HTML (jesli konieczne)
const cleanHTML = DOMPurify.sanitize(userInput);
```

---

## CORS Configuration

```typescript
// Backend CORS config
app.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,  // Dla cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
});
```

---

## Rate Limiting

Ochrona przed DDoS i brute force:

```typescript
// plugins/rateLimit.ts
app.register(fastifyRateLimit, {
  max: 100,           // Max 100 requestow
  timeWindow: '1 minute',
  errorResponseBuilder: () => ({
    error: 'Too Many Requests',
    message: 'Przekroczono limit requestow. Sprobuj ponownie pozniej.'
  })
});

// Stricter limit dla logowania
app.register(fastifyRateLimit, {
  max: 5,
  timeWindow: '15 minutes',
  keyGenerator: (req) => req.ip,
  routeOptions: {
    url: '/auth/login'
  }
});
```

---

## Sensitive Data Handling

### Hasla

```typescript
import bcrypt from 'bcrypt';

// Hashowanie hasla
const passwordHash = await bcrypt.hash(password, 12);

// Weryfikacja hasla
const isValid = await bcrypt.compare(password, user.passwordHash);
```

### Zmienne srodowiskowe

```env
# .env (NIE COMMITUJ!)
JWT_SECRET=your-super-secret-key-at-least-32-chars
SCHUCO_PASSWORD=secret-password
```

```typescript
// Sprawdzenie wymaganych zmiennych
const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
```

---

## Logging i Audit

### Logowanie zdarzen bezpieczenstwa

```typescript
// Logowanie nieudanych prob logowania
logger.warn('Failed login attempt', {
  email: req.body.email,
  ip: req.ip,
  timestamp: new Date()
});

// Logowanie dostepu do wrażliwych danych
logger.info('Sensitive data accessed', {
  userId: req.user.id,
  resource: 'orders',
  action: 'export'
});
```

---

## Checklist bezpieczenstwa

- [ ] JWT_SECRET ma minimum 32 znaki
- [ ] Cookies sa httpOnly i secure
- [ ] CORS jest skonfigurowany dla konkretnego origin
- [ ] Rate limiting jest wlaczony
- [ ] Hasla sa hashowane bcrypt
- [ ] Walidacja Zod na wszystkich endpointach
- [ ] Brak raw SQL queries
- [ ] Zmienne srodowiskowe nie sa w Git

---

## Powiazane Dokumenty

- [Backend Architecture](./backend.md)
- [Communication Flow](./communication-flow.md)

---

**Ostatnia aktualizacja:** 2026-01-20
