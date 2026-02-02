#!/bin/bash

echo "=== Correction des imports Chakra UI ==="

# Ajouter le package manquant
cd web-frontend
npm install @chakra-ui/icons

# Revenir aux composants UI simples pour éviter les problèmes de compatibilité
echo "Remplacement des composants Chakra UI par des composants HTML simples..."

# Remplacer les imports problématiques dans login
sed -i 's/@chakra-ui\/icons/react-icons\/fi/g' app/login/page.tsx
sed -i 's/ViewIcon, ViewOffIcon, EmailIcon, LockIcon/FiEye, FiEyeOff, FiMail, FiLock/g' app/login/page.tsx
sed -i 's/AlertIcon,//g' app/login/page.tsx
sed -i 's/FormControl,//g' app/login/page.tsx
sed -i 's/FormLabel,//g' app/login/page.tsx
sed -i 's/InputLeftElement,//g' app/login/page.tsx
sed -i 's/InputRightElement,//g' app/login/page.tsx

# Remplacer les imports problématiques dans register
sed -i 's/@chakra-ui\/icons/react-icons\/fi/g' app/register/page.tsx
sed -i 's/ViewIcon, ViewOffIcon, EmailIcon, LockIcon/FiEye, FiEyeOff, FiMail, FiLock/g' app/register/page.tsx
sed -i 's/AtSignIcon/FiAtSign/g' app/register/page.tsx
sed -i 's/AlertIcon,//g' app/register/page.tsx
sed -i 's/FormControl,//g' app/register/page.tsx
sed -i 's/FormLabel,//g' app/register/page.tsx
sed -i 's/InputLeftElement,//g' app/register/page.tsx
sed -i 's/InputRightElement,//g' app/register/page.tsx

# Corriger les autres pages
sed -i 's/AvatarBadge,//g' app/users/page.tsx
sed -i 's/FiCrown/FiUser/g' app/users/page.tsx
sed -i 's/FiBarChart3/FiBarChart/g' app/projects/page.tsx
sed -i 's/MenuButton,//g' app/projects/page.tsx app/tasks/page.tsx
sed -i 's/MenuList,//g' app/projects/page.tsx app/tasks/page.tsx
sed -i 's/InputLeftElement,//g' app/projects/page.tsx app/tasks/page.tsx app/users/page.tsx

# Corriger le dashboard
sed -i 's/StatNumber,//g' app/dashboard/page.tsx
sed -i 's/StatLabel,//g' app/dashboard/page.tsx
sed -i 's/StatHelpText,//g' app/dashboard/page.tsx

# Simplifier le provider Chakra
cat > components/providers/chakra-provider.tsx << 'EOF'
'use client'

import { ChakraProvider } from '@chakra-ui/react'

export function ChakraUIProvider({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider>
      {children}
    </ChakraProvider>
  )
}
EOF

echo "✓ Corrections appliquées"
echo "Relancement du build..."