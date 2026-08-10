import { PrismaClient, EmployeeRole, CategoryType } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const restaurant = await prisma.restaurant.upsert({
    where: { id: "default-restaurant" },
    update: {},
    create: {
      id: "default-restaurant",
      name: "OSdex Restaurante",
    },
  });

  console.log("Restaurante criado:", restaurant.name);

  const isProd = process.env.NODE_ENV === "production";
  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD ?? (isProd ? undefined : "12345678");
  const adminPin = process.env.SEED_ADMIN_PIN ?? (isProd ? undefined : "1234");

  if (!adminPassword || !adminPin) {
    console.error(
      "Defina SEED_ADMIN_PASSWORD e SEED_ADMIN_PIN para rodar o seed em produção.",
    );
    process.exit(1);
  }

  const adminHash = await bcrypt.hash(adminPassword, 12);
  const adminPinHash = await bcrypt.hash(adminPin, 12);

  const admin = await prisma.employee.upsert({
    where: { email: "fluixit@gmail.com" },
    update: {
      name: "Administrador",
      passwordHash: adminHash,
      pin: adminPinHash,
      role: EmployeeRole.MANAGER,
      restaurantId: restaurant.id,
      active: true,
    },
    create: {
      name: "Administrador",
      email: "fluixit@gmail.com",
      passwordHash: adminHash,
      pin: adminPinHash,
      role: EmployeeRole.MANAGER,
      restaurantId: restaurant.id,
      active: true,
    },
  });

  console.log("Administrador criado:", admin.email);

  const deactivated = await prisma.employee.updateMany({
    where: { email: "admin@osdex.com.br" },
    data: { active: false },
  });
  console.log("Conta admin@osdex.com.br desativada:", deactivated.count);

  const passwordHash = await bcrypt.hash("12345678", 12);

  const printer = await prisma.printer.upsert({
    where: { id: "default-printer-cozinha" },
    update: {},
    create: {
      id: "default-printer-cozinha",
      name: "Cozinha Principal",
      ip: "192.168.1.100",
      port: 9100,
      location: "COZINHA",
      restaurantId: restaurant.id,
      rules: {
        create: [
          { categoryType: CategoryType.FOOD },
          { categoryType: CategoryType.DESSERT },
        ],
      },
    },
    include: { rules: true },
  });

  console.log("Impressora criada:", printer.name);

  const waiter = await prisma.employee.upsert({
    where: { email: "garcom@osdex.com.br" },
    update: {},
    create: {
      name: "Garçom Teste",
      email: "garcom@osdex.com.br",
      passwordHash,
      pin: "1234",
      role: EmployeeRole.WAITER,
      restaurantId: restaurant.id,
      active: true,
    },
  });

  console.log("Garçom criado:", waiter.email);

  const categoriesData = [
    { name: "Entradas", type: CategoryType.FOOD },
    { name: "Pratos Principais", type: CategoryType.FOOD },
    { name: "Bebidas", type: CategoryType.DRINK },
    { name: "Sobremesas", type: CategoryType.DESSERT },
  ];

  for (const cat of categoriesData) {
    const existing = await prisma.category.findFirst({
      where: { name: cat.name, restaurantId: restaurant.id },
    });
    if (!existing) {
      await prisma.category.create({
        data: {
          name: cat.name,
          type: cat.type,
          restaurantId: restaurant.id,
        },
      });
      console.log("Categoria criada:", cat.name);
    }
  }

  const tables = [1, 2, 3, 4, 5, 6, 7, 8];
  for (const num of tables) {
    const existing = await prisma.table.findFirst({
      where: { number: num, restaurantId: restaurant.id },
    });
    if (!existing) {
      await prisma.table.create({
        data: {
          number: num,
          qrCode: `TABLE-${restaurant.id}-${num}`,
          restaurantId: restaurant.id,
        },
      });
    }
  }
  console.log("Mesas criadas: 1-8");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
