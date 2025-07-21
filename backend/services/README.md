# TropiPay Wallet - Services Architecture

## 📋 Arquitectura de Servicios

Esta refactorización separa la lógica en servicios especializados para mejorar la mantenibilidad y escalabilidad.

### 🏗️ Estructura de Servicios

```
backend/
├── services/
│   ├── tropiPayService.js    # Microservicio TropiPay (aislado)
│   ├── userService.js        # Lógica de negocio + DB
│   └── README.md            # Esta documentación
├── server-refactored.js     # Servidor principal refactorizado
├── server.js               # Servidor original (mantener como backup)
└── database.js             # Operaciones de base de datos
```

## 🔧 TropiPayService (Microservicio)

### Características:
- ✅ **Aislado**: Solo maneja comunicación con TropiPay API
- ✅ **Sin dependencias DB**: No accede a base de datos
- ✅ **Stateless**: No mantiene estado de la aplicación
- ✅ **Reutilizable**: Puede usarse desde cualquier parte
- ✅ **Interceptors**: Logging completo de requests/responses

### Métodos disponibles:

#### Autenticación
```javascript
await tropiPayService.getAccessToken(clientId, clientSecret)
await tropiPayService.getUserProfile(accessToken)
```

#### Cuentas
```javascript
await tropiPayService.getAccounts(accessToken)
```

#### Beneficiarios
```javascript
await tropiPayService.getBeneficiaries(accessToken, offset, limit)
await tropiPayService.createBeneficiary(accessToken, beneficiaryData)
```

#### Movimientos
```javascript
await tropiPayService.getAccountMovements(accessToken, accountId, offset, limit)
```

#### Transferencias
```javascript
await tropiPayService.simulateTransfer(accessToken, transferData)
await tropiPayService.executeTransfer(accessToken, transferData)
```

#### 2FA
```javascript
await tropiPayService.requestSMSCode(accessToken, phoneNumber)
```

#### Utilidades de Conversión
```javascript
tropiPayService.convertToCentavos(amount)
tropiPayService.convertFromCentavos(amount)
tropiPayService.convertAccountsFromCentavos(accounts)
tropiPayService.convertMovementsFromCentavos(movementsData)
tropiPayService.prepareTransferData(transferData)
```

## 🏢 UserService (Lógica de Negocio)

### Características:
- ✅ **Coordina**: Entre TropiPayService y Database
- ✅ **Lógica de negocio**: Validaciones, conversiones, estado
- ✅ **Manejo de errores**: Fallbacks a datos locales
- ✅ **Cache local**: Guarda datos en BD para offline/performance

### Métodos disponibles:

#### Autenticación
```javascript
await userService.authenticateUser(clientId, clientSecret)
```

#### Cuentas
```javascript
await userService.refreshUserAccounts(userId)
```

#### Beneficiarios
```javascript
await userService.refreshUserBeneficiaries(userId, offset, limit)
await userService.createUserBeneficiary(userId, beneficiaryData)
```

#### Movimientos
```javascript
await userService.getUserAccountMovements(userId, accountId, offset, limit)
```

#### Transferencias
```javascript
await userService.simulateUserTransfer(userId, transferData)
await userService.executeUserTransfer(userId, transferData)
await userService.requestTransferSMS(userId, phoneNumber)
```

## 🌐 Server (API Endpoints)

El servidor refactorizado (`server-refactored.js`) es mucho más limpio:

- ✅ **Endpoints simples**: Solo coordinan entre servicios
- ✅ **Sin lógica compleja**: Toda la lógica está en servicios
- ✅ **Manejo de errores centralizado**
- ✅ **Código más legible y mantenible**

## 🚀 Ventajas de la Nueva Arquitectura

### 1. **Separación de Responsabilidades**
- TropiPayService: Solo API de TropiPay
- UserService: Lógica de negocio + DB
- Server: Endpoints y coordinación

### 2. **Testabilidad**
- Cada servicio se puede testear independientemente
- Mocking más fácil para pruebas unitarias

### 3. **Escalabilidad**
- TropiPayService puede convertirse en microservicio independiente
- UserService puede manejar múltiples fuentes de datos
- Fácil agregar nuevos servicios

### 4. **Mantenibilidad**
- Cambios en TropiPay API solo afectan TropiPayService
- Cambios en DB solo afectan UserService
- Código más organizado y fácil de entender

### 5. **Reutilización**
- TropiPayService puede usarse en otros proyectos
- UserService puede extenderse para otros casos de uso

## 📝 Migración

Para usar la nueva arquitectura:

1. **Cambiar servidor**:
   ```bash
   # En lugar de
   node server.js
   
   # Usar
   node server-refactored.js
   ```

2. **El frontend no necesita cambios**: Los endpoints siguen siendo los mismos

3. **Mantener backup**: El `server.js` original se mantiene como referencia

## 🔍 Logs y Debugging

Los logs ahora están más organizados:
- **TropiPayService**: Logs detallados de API calls
- **UserService**: Logs de lógica de negocio  
- **Server**: Logs de endpoints y coordinación

## 🎯 Próximos Pasos

1. **Configuración por entorno**: Agregar config para dev/prod
2. **Rate limiting**: Límites de requests por usuario
3. **Caching avanzado**: Redis para cache distribuido
4. **Métricas**: Monitoreo de performance de cada servicio
5. **Containerización**: Docker para cada servicio
6. **API Gateway**: Para ruteo entre microservicios