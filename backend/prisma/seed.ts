import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.orderItem.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.item.deleteMany();
  await prisma.cliente.deleteMany();

  const [ana, bruno, carla, diego] = await Promise.all([
    prisma.cliente.create({
      data: { nome: 'Ana Souza', email: 'ana.souza@example.com', telefone: '11988887777' },
    }),
    prisma.cliente.create({
      data: { nome: 'Bruno Lima', email: 'bruno.lima@example.com', telefone: '11977776666' },
    }),
    prisma.cliente.create({
      data: { nome: 'Carla Nunes', email: 'carla.nunes@example.com', telefone: '11966665555' },
    }),
    prisma.cliente.create({
      data: { nome: 'Diego Alves', email: 'diego.alves@example.com', telefone: '11955554444' },
    }),
  ]);

  const [cerveja, agua, hamburguer, pastel, camiseta] = await Promise.all([
    prisma.item.create({
      data: { nome: 'Cerveja Long Neck', descricao: 'Long neck 355ml', valorUnitario: 12 },
    }),
    prisma.item.create({
      data: { nome: 'Água Mineral', descricao: 'Garrafa 500ml', valorUnitario: 5 },
    }),
    prisma.item.create({
      data: { nome: 'Hambúrguer Artesanal', descricao: 'Combo com batata', valorUnitario: 28 },
    }),
    prisma.item.create({
      data: { nome: 'Pastel', descricao: 'Sabor carne ou queijo', valorUnitario: 15 },
    }),
    prisma.item.create({
      data: { nome: 'Camiseta do Festival', descricao: 'Edição limitada', valorUnitario: 60 },
    }),
  ]);

  await prisma.pedido.create({
    data: {
      data: new Date('2026-08-10T14:30:00Z'),
      clienteId: ana.id,
      itens: {
        create: [
          { itemId: cerveja.id, quantidade: 2, valorUnitarioPraticado: cerveja.valorUnitario },
          { itemId: hamburguer.id, quantidade: 1, valorUnitarioPraticado: hamburguer.valorUnitario },
        ],
      },
    },
  });

  await prisma.pedido.create({
    data: {
      data: new Date('2026-08-10T18:15:00Z'),
      clienteId: bruno.id,
      itens: {
        create: [
          { itemId: agua.id, quantidade: 3, valorUnitarioPraticado: agua.valorUnitario },
          { itemId: pastel.id, quantidade: 2, valorUnitarioPraticado: pastel.valorUnitario },
        ],
      },
    },
  });

  await prisma.pedido.create({
    data: {
      data: new Date('2026-08-11T20:00:00Z'),
      clienteId: carla.id,
      itens: {
        create: [
          { itemId: camiseta.id, quantidade: 1, valorUnitarioPraticado: camiseta.valorUnitario },
          // valor praticado propositalmente diferente do valor atual do item,
          // simulando um reajuste de preço depois da venda.
          { itemId: cerveja.id, quantidade: 4, valorUnitarioPraticado: 10 },
        ],
      },
    },
  });

  await prisma.pedido.create({
    data: {
      data: new Date('2026-08-12T13:00:00Z'),
      clienteId: diego.id,
      itens: {
        create: [
          { itemId: hamburguer.id, quantidade: 2, valorUnitarioPraticado: hamburguer.valorUnitario },
          { itemId: agua.id, quantidade: 2, valorUnitarioPraticado: agua.valorUnitario },
        ],
      },
    },
  });

  await prisma.pedido.create({
    data: {
      data: new Date('2026-08-12T21:45:00Z'),
      clienteId: ana.id,
      itens: {
        create: [{ itemId: pastel.id, quantidade: 5, valorUnitarioPraticado: pastel.valorUnitario }],
      },
    },
  });

  console.log('Seed concluído.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
