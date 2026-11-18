# Documentación: Mejoras y conversión a APK (React Native + Expo Go)

**Proyecto:** registrosPAS / intern-attendance  
**Estado actual:** Aplicación web Next.js (App Router) + Prisma + PostgreSQL  
**Objetivo:** Mejorar la arquitectura, diseñar para roles (ADMIN / PASANTE) y generar un APK instalable con React Native + Expo (Expo Go para pruebas, EAS Build para APK/AAB).

---

## 1. Análisis del proyecto actual

### 1.1 Qué tiene hoy
- **Framework:** Next.js 16 (App Router, React 19)
- **Base de datos:** PostgreSQL mediante Prisma ORM (`@prisma/client`, `@prisma/adapter-pg`)
- **Autenticación:** JWT (`jsonwebtoken`) + cookie `httpOnly` (`token`)
- **Roles:** `ADMIN` y `PASANTE` (enum `Role` en Prisma)
- **Modelos principales:**
  - `User` (id, email, password, name, role, mustChangePassword…)
  - `Place` (lugares con lat/lng/radio para geocerca)
  - `Pasante` (perfil vinculado a User, cédula, horario, lugar, fechas)
  - `Attendance` (registro de asistencia con fecha, horaEntrada, horaSalida, latitud, longitud, status)
  - `AdminLog` (auditoría de acciones de admin)
- **Rutas API existentes** (disponibles para ser consumidas por la app móvil):
  - `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/change-password`, `GET /api/auth/me`
  - `GET /api/dashboard` (solo ADMIN)
  - `GET/POST /api/pasantes`, `GET/PUT/DELETE /api/pasantes/[id]` (solo ADMIN)
  - `GET/POST /api/places`, `GET/PUT/DELETE /api/places/[id]` (solo ADMIN)
  - `GET /api/attendance`, `POST /api/attendance/checkin`, `POST /api/attendance/checkout`, `GET /api/attendance/status`, `GET/PUT/DELETE /api/attendance/[id]`
  - `GET /api/export/excel`, `GET /api/export/pdf` (solo ADMIN)
- **Middleware de rutas:** `src/proxy.ts` protege rutas por rol y redirecciona según sesión.
- **Utilidades:** cálculo de distancia haversine (`location.ts`), validación de horarios (`hours.ts`), reportes (`reports.ts`), lugares (`places.ts`).

### 1.2 Limitaciones para convertir directamente a móvil
- Next.js renderiza HTML en servidor/navegador; no genera APK nativo.
- La autenticación depende de cookies `httpOnly`, difíciles de manejar en WebView nativo. Se recomienda pasar el **token JWT en el cuerpo de la respuesta y almacenarlo en `expo-secure-store`** (o `AsyncStorage`) para enviarlo como header `Authorization: Bearer <token>`.
- Las páginas web usan Tailwind CSS y componentes de React DOM; en React Native se deben reescribir las vistas con componentes de React Native (`View`, `Text`, `FlatList`, `ScrollView`, etc.).
- No hay navegación móvil; se debe agregar `@react-navigation/native` + stack.

---

## 2. Arquitectura propuesta

```
┌─────────────────────┐      HTTPS / REST JSON      ┌─────────────────────────────┐
│   App Móvil (Expo)  │◄───────────────────────────►│  Backend Next.js (API)      │
│  React Native       │                             │  (PostgreSQL + Prisma)      │
│  - Expo Go (dev)    │                             │  - Rutas /api/*             │
│  - APK / AAB (prod) │                             │  - JWT auth                 │
│  - AsyncStorage     │                             │  - Roles ADMIN / PASANTE    │
└─────────────────────┘                             └─────────────────────────────┘
```

**Estrategia:** Mantener el backend Next.js como **API REST** centralizada. La app móvil en Expo consume esa API. No se duplica la base de datos en el dispositivo (evita problemas de sincronización y seguridad). Se puede agregar `expo-sqlite` solo como caché offline opcional (mejora futura).

---

## 3. Diseño de base de datos (mantener y extender)

Se conserva el esquema Prisma actual. Se sugieren las siguientes mejoras opcionales en `prisma/schema.prisma`:

```prisma
// Ejemplo de extensión para auditoría móvil y dispositivos
model Device {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique   // token de push (expo-notifications)
  platform  String   // "android" | "ios"
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Modelos clave que usará la app:**
| Modelo | Uso en app móvil | Rol |
|--------|------------------|-----|
| `User` | Login, perfil, cambio de contraseña | Ambos |
| `Pasante` | Datos del pasante, horarios, lugar asignado | Ambos |
| `Place` | Geocerca para marcar entrada/salida | ADMIN configura / PASANTE consulta |
| `Attendance` | Marcar entrada/salida, ver historial | Ambos |
| `AdminLog` | Auditoría de acciones admin | ADMIN |

---

## 4. Diseño de carpetas del proyecto React Native / Expo

Se recomienda crear una carpela separada dentro del repositorio (monorepo simple) o un repositorio aparte. Ejemplo: `registrosPAS/mobile/`.

```
registrosPAS/
├── prisma/                 # (ya existe) esquema y migraciones PostgreSQL
├── src/                    # (ya existe) backend Next.js API
├── mobile/                 # <-- NUEVO: app React Native con Expo
│   ├── app.json            # Config Expo (nombre, package, icono, splash, permisos)
│   ├── eas.json            # Perfiles de build EAS (preview = APK, production = AAB)
│   ├── package.json
│   ├── tsconfig.json
│   ├── babel.config.js
│   ├── .env                # EXPO_PUBLIC_API_URL=http://192.168.x.x:3000
│   ├── .gitignore
│   ├── src/
│   │   ├── assets/
│   │   │   ├── images/
│   │   │   ├── icons/
│   │   │   └── fonts/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Text.tsx
│   │   │   │   ├── Avatar.tsx
│   │   │   │   ├── Loader.tsx
│   │   │   │   └── SafeArea.tsx
│   │   │   ├── admin/
│   │   │   │   ├── AdminSidebar.tsx
│   │   │   │   ├── StatsCards.tsx
│   │   │   │   ├── PasantesList.tsx
│   │   │   │   ├── PasanteForm.tsx
│   │   │   │   ├── PlacesList.tsx
│   │   │   │   ├── PlaceForm.tsx
│   │   │   │   ├── ReportsPanel.tsx
│   │   │   │   ├── AttendanceCalendar.tsx
│   │   │   │   └── ExportButtons.tsx
│   │   │   └── pasante/
│   │   │       ├── ClockInButton.tsx
│   │   │       ├── AttendanceHistory.tsx
│   │   │       └── ProfileCard.tsx
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx          # Proveedor de sesión y rol
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useAttendance.ts
│   │   │   ├── useLocation.ts
│   │   │   └── useStorage.ts
│   │   ├── lib/
│   │   │   ├── api.ts                   # axios / fetch base con interceptors de auth
│   │   │   ├── storage.ts               # envoltorio expo-secure-store / AsyncStorage
│   │   │   ├── date.ts                  # helpers date-fns
│   │   │   └── validation.ts            # zod / yup schemas
│   │   ├── navigation/
│   │   │   ├── RootNavigator.tsx        # switch según autenticación y rol
│   │   │   ├── AuthNavigator.tsx        # login, cambiar contraseña
│   │   │   ├── AdminNavigator.tsx       # stack de pantallas admin
│   │   │   └── PasanteNavigator.tsx     # stack de pantallas pasante
│   │   ├── screens/
│   │   │   ├── auth/
│   │   │   │   ├── LoginScreen.tsx
│   │   │   │   ├── ChangePasswordScreen.tsx
│   │   │   │   └── ForgotPasswordScreen.tsx
│   │   │   ├── admin/
│   │   │   │   ├── DashboardScreen.tsx
│   │   │   │   ├── PasantesScreen.tsx
│   │   │   │   ├── PasanteDetailScreen.tsx
│   │   │   │   ├── PlacesScreen.tsx
│   │   │   │   ├── PlaceDetailScreen.tsx
│   │   │   │   ├── ReportsScreen.tsx
│   │   │   │   ├── CalendarScreen.tsx
│   │   │   │   └── AttendanceRecordsScreen.tsx
│   │   │   └── pasante/
│   │   │       ├── DashboardScreen.tsx
│   │   │       ├── CheckInScreen.tsx    # marca entrada/salida con GPS
│   │   │       ├── HistoryScreen.tsx    # historial propio
│   │   │       └── ProfileScreen.tsx
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── attendance.service.ts
│   │   │   ├── pasante.service.ts
│   │   │   ├── place.service.ts
│   │   │   └── report.service.ts
│   │   ├── types/
│   │   │   └── index.ts                 # Role, UserSession, AttendanceRecord, etc.
│   │   └── utils/
│   │       ├── distance.ts              # haversine (reutilizar lógica del backend o duplicar ligero)
│   │       └── format.ts
│   ├── android/
│   └── ios/
├── DOCUMENTACION_MEJORA_Y_APK_EXPO.md   # <-- este archivo
└── README.md
```

---

## 5. Pantallas por rol (RBAC - Role Based Access Control)

### 5.1 Rol ADMIN
| Pantalla | Descripción |
|----------|-------------|
| `Dashboard` | Resumen: totales, presentes, ausentes, tardanzas, permisos, actividad reciente, gráfica semanal |
| `Pasantes` | CRUD de pasantes (alta, editar, desactivar/activar, asignar lugar y horario) |
| `Lugares (Places)` | CRUD de lugares con coordenadas y radio de geocerca (mappa opcional) |
| `Registros / Asistencia` | Listado general de asistencias con filtros (pasante, fecha, estado) |
| `Reportes` | Reportes por rango de fechas, exportar a Excel y PDF |
| `Calendario` | Vista mensual de asistencias |
| `Perfil / Cambiar contraseña` | Cambio de contraseña del admin |

### 5.2 Rol PASANTE
| Pantalla | Descripción |
|----------|-------------|
| `Dashboard` | Tarjeta de estado (activo/inactivo), turno, próximo marcado |
| `Check-In` | Marcar entrada y salida con verificación de geolocalización (dentro del radio del lugar asignado) |
| `Historial` | Historial propio de asistencias con estados y notas |
| `Perfil` | Datos personales, cédula, institución, carrera, cambiar contraseña |

### 5.3 Pantallas comunes (ambos roles)
- `Login` (email + contraseña)
- `Cambiar contraseña` (primer ingreso o solicitado)
- `Cierre de sesión`

---

## 6. Autenticación y roles en la app móvil

### 6.1 Flujo de auth recomendado
1. El usuario ingresa email y contraseña en `LoginScreen`.
2. La app llama `POST /api/auth/login` del backend.
3. El backend responde `{ token, user, mustChangePassword }`.
4. La app guarda el token en `expo-secure-store` (más seguro que `AsyncStorage`) y el `user` en contexto React.
5. Si `mustChangePassword === true`, se redirige a `ChangePasswordScreen`.
6. Según `user.role`:
   - `ADMIN` → `AdminNavigator` (pantallas admin)
   - `PASANTE` → `PasanteNavigator` (pantallas pasante)
7. Cada request posterior incluye header: `Authorization: Bearer <token>`.
8. Si el backend responde `401`, se limpia el storage y se redirige a `Login`.

### 6.2 Middleware de navegación (pseudo-código)
```tsx
// navigation/RootNavigator.tsx
function RootNavigator() {
  const { token, user, loading } = useAuth();

  if (loading) return <SplashScreen />;

  if (!token) return <AuthNavigator />;

  if (user.role === 'ADMIN') return <AdminNavigator />;
  return <PasanteNavigator />;
}
```

---

## 7. Endpoints de API que consumirá la app móvil

El backend Next.js ya expone estos endpoints. Se recomienda agregarle CORS y aceptar `Authorization: Bearer` además de cookies.

| Método | Endpoint | Descripción | Rol |
|--------|----------|-------------|-----|
| POST | `/api/auth/login` | Autenticación y obtención de JWT | Ambos |
| POST | `/api/auth/logout` | Cerrar sesión | Ambos |
| POST | `/api/auth/change-password` | Cambiar contraseña | Ambos |
| GET | `/api/auth/me` | Datos del usuario autenticado | Ambos |
| GET | `/api/dashboard` | Métricas del día y semana | ADMIN |
| GET | `/api/pasantes` | Listar pasantes (paginado) | ADMIN |
| POST | `/api/pasantes` | Crear pasante | ADMIN |
| GET/PUT/DELETE | `/api/pasantes/[id]` | Detalle/actualizar/eliminar pasante | ADMIN |
| GET | `/api/places` | Listar lugares (geocerca) | ADMIN |
| POST | `/api/places` | Crear lugar | ADMIN |
| GET/PUT/DELETE | `/api/places/[id]` | Detalle lugar | ADMIN |
| GET | `/api/attendance` | Listar asistencias con filtros | Ambos (admin ve todos, pasante solo suya si se filtra) |
| POST | `/api/attendance/checkin` | Marcar entrada con lat/lng | PASANTE |
| POST | `/api/attendance/checkout` | Marcar salida con lat/lng | PASANTE |
| GET | `/api/attendance/status` | Estado de asistencia del día | PASANTE |
| GET | `/api/export/excel` | Exportar reporte Excel | ADMIN |
| GET | `/api/export/pdf` | Exportar reporte PDF | ADMIN |

**Nota para el backend:** Agregar un endpoint `GET /api/attendance/mine` (o filtrar por `pasanteId` desde el token) para que el pasante solo vea sus propios registros sin necesidad de que el admin lo exponga todo.

---

## 8. Pasos técnicos para convertir en APK con Expo

### 8.1 Crear el proyecto Expo
```bash
# Dentro de registrosPAS/
npx create-expo-app mobile --template blank-typescript
cd mobile
```

### 8.2 Instalar dependencias esenciales
```bash
npx expo install expo-secure-store expo-location expo-splash-screen expo-status-bar
npm install @react-navigation/native @react-navigation/stack react-native-screens react-native-safe-area-context
npm install axios date-fns clsx tailwind-merge react-native-reanimated react-native-gesture-handler
```

Dependencias opcionales (mejora):
```bash
npx expo install expo-notifications expo-local-authentication expo-image-picker expo-camera expo-sqlite
```

### 8.3 Configurar `app.json`
```json
{
  "expo": {
    "name": "RegistrosPAS",
    "slug": "registros-pas",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./src/assets/images/icon.png",
    "splash": {
      "image": "./src/assets/images/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "updates": { "fallbackToCacheTimeout": 0 },
    "assetBundlePatterns": ["**/*"],
    "ios": { "bundleIdentifier": "com.empresa.registrosPAS" },
    "android": {
      "package": "com.empresa.registrosPAS",
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "INTERNET"
      ],
      "adaptiveIcon": {
        "foregroundImage": "./src/assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      }
    },
    "extra": { "eas": { "projectId": "TU_EAS_PROJECT_ID" } }
  }
}
```

### 8.4 Configurar variables de entorno
Archivo `mobile/.env`:
```
EXPO_PUBLIC_API_URL=http://192.168.1.XX:3000   # IP de tu PC donde corre el backend Next.js
EXPO_PUBLIC_APP_NAME=RegistrosPAS
```
En el backend Next.js, permitir peticiones desde la app móvil (CORS o permitir el encabezado `Authorization`).

### 8.5 Probar en Expo Go
```bash
npx expo start
```
Escanea el QR con la app **Expo Go** en tu dispositivo Android. Asegúrate de que el móvil y el PC estén en la misma red Wi-Fi y que el backend esté corriendo (`npm run dev` en Next.js).

### 8.6 Generar APK (build)
Instalar EAS CLI:
```bash
npm install -g eas-cli
eas login
eas build:configure
```

Configurar `eas.json`:
```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "aab"
      }
    }
  }
}
```

Generar APK para pruebas (firmado por Expo, apto para instalar en dispositivos):
```bash
eas build -p android --profile preview
```

Generar AAB para Google Play Store (producción):
```bash
eas build -p android --profile production
```

El artefacto `.apk` se descarga desde el panel de Expo o enlace generado.

---

## 9. Mejoras sugeridas al proyecto

### 9.1 Backend (Next.js + Prisma)
1. **Soporte dual de auth:** Aceptar JWT tanto por cookie como por header `Authorization: Bearer` para facilitar el consumo desde React Native.
2. **CORS configurado:** Permitir orígenes de la app móvil (en desarrollo `*` o la IP del emulador; en producción el dominio de la app si usa WebView, o directamente API REST).
3. **Endpoint `GET /api/attendance/mine`:** Para que el pasante consulte solo sus registros.
4. **Validación con Zod:** Esquemas de entrada en todas las rutas API.
5. **Rate limiting:** Evitar abusos en login y marcados.
6. **Logs de auditoría:** Llenar `AdminLog` en cada acción crítica (crear/editar/eliminar pasantes, lugares, exportar reportes).
7. **Notificaciones push:** Endpoint para registrar `Device.token` (expo-notifications) y enviar avisos de entrada/salida o recordar marcar.

### 9.2 App móvil (Expo)
1. **Splash screen y ícono nativo:** Configurar en `app.json`.
2. **Almacenamiento seguro:** `expo-secure-store` para el JWT (no `AsyncStorage` plano).
3. **Geolocalización en tiempo real:** `expo-location` con permisos `ACCESS_FINE_LOCATION` y validación de geocerca antes de permitir el marcado.
4. **Biometría:** `expo-local-authentication` (huella/facial) para desbloquear la app o confirmar marcado.
5. **Modo offline:** `expo-sqlite` para guardar marcados localmente y sincronizar cuando haya conexión (cola de sincronización).
6. **Foto al marcar:** `expo-image-picker` o `expo-camera` para adjuntar evidencia al marcar entrada/salida.
7. **Push notifications:** `expo-notifications` para alertar al pasante si olvida marcar y al admin sobre ausencias.
8. **Navegación protegida:** Guards por rol (`ADMIN` no ve pantallas de pasante y viceversa).
9. **Tema oscuro/claro:** `expo-theme-manager` o contexto propio.
10. **Exportar reportes desde móvil:** Reutilizar endpoints `/api/export/excel` y `/api/export/pdf` y abrir el archivo con `expo-sharing` o `expo-linking`.

### 9.3 UX / UI
- Componentes reutilizables (`Button`, `Input`, `Card`, `Modal`) con estilo consistente para ambos roles.
- Feedback visual de carga (`ActivityIndicator`) y errores (`Alert` o `Toast` con `react-native-toast-message`).
- Listas paginadas (`FlatList` con `ListEmptyComponent`).
- Formularios con validación en tiempo real (Zod + React Hook Form adaptado a RN).

---

## 10. Checklist de implementación

- [ ] Clonar/revisar esquema Prisma y asegurar que la base de datos PostgreSQL esté accesible desde la red donde estará el móvil.
- [ ] Exponer rutas API del backend Next.js y habilitar recepción de `Authorization: Bearer`.
- [ ] Crear carpeta `mobile/` con `create-expo-app`.
- [ ] Instalar navegación (`@react-navigation/native/stack`) y pantallas base.
- [ ] Implementar `AuthContext` con `expo-secure-store`.
- [ ] Implementar `api.ts` con interceptores de token y manejo de `401`.
- [ ] Crear pantallas de login y cambio de contraseña.
- [ ] Crear pantallas ADMIN (Dashboard, Pasantes, Lugares, Reportes, Registros).
- [ ] Crear pantallas PASANTE (Dashboard, Check-In con GPS, Historial, Perfil).
- [ ] Implementar geolocalización y validación de geocerca en `CheckInScreen`.
- [ ] Probar en Expo Go con dispositivo físico y backend en modo desarrollo.
- [ ] Configurar `eas.json` y generar APK con `eas build -p android --profile preview`.
- [ ] Instalar APK en dispositivo y probar flujo completo por rol.
- [ ] (Opcional) Configurar firma propia para producción y subir AAB a Google Play Console.

---

## 11. Ejemplo rápido de servicio de autenticación (`mobile/src/services/auth.service.ts`)

```ts
import { SecureStore } from 'expo-secure-store';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL!;

export const authService = {
  async login(email: string, password: string) {
    const { data } = await axios.post(`${API_URL}/api/auth/login`, { email, password });
    await SecureStore.setItemAsync('token', data.token);
    await SecureStore.setItemAsync('user', JSON.stringify(data.user));
    return data;
  },

  async getToken() {
    return await SecureStore.getItemAsync('token');
  },

  async logout() {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
  },
};
```

```ts
// mobile/src/lib/api.ts
import axios from 'axios';
import { SecureStore } from 'expo-secure-store';

const api = axios.create({ baseURL: process.env.EXPO_PUBLIC_API_URL });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await SecureStore.deleteItemAsync('token');
      // redirigir al login desde el contexto de navegación
    }
    return Promise.reject(err);
  }
);

export default api;
```

---

## 12. Conclusión

El proyecto actual es una base sólida (Next.js + Prisma + roles + geolocalización) que puede convertirse en una aplicación móvil completa sin reescribir la lógica de negocio. La estrategia recomendada es **mantener el backend Next.js como API REST** y construir el frontend móvil en **Expo / React Native**, consumiendo los endpoints existentes, almacenando el JWT de forma segura y diferenciando la navegación por **rol (ADMIN / PASANTE)**. Con EAS Build se genera el APK para instalación directa o el AAB para Google Play Store.
