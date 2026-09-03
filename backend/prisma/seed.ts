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

  // Clientes extras só pra variar os nomes nos 16 pedidos gerados no loop
  // abaixo (sem isso, ana/bruno/carla/diego repetiriam 6x cada em vez de 2x).
  const [eduardo, fernanda, gabriel, helena, igor, juliana, lucas, mariana] = await Promise.all([
    prisma.cliente.create({
      data: { nome: 'Eduardo Martins', email: 'eduardo.martins@example.com', telefone: '11944443333' },
    }),
    prisma.cliente.create({
      data: { nome: 'Fernanda Costa', email: 'fernanda.costa@example.com', telefone: '11933332222' },
    }),
    prisma.cliente.create({
      data: { nome: 'Gabriel Rocha', email: 'gabriel.rocha@example.com', telefone: '11922221111' },
    }),
    prisma.cliente.create({
      data: { nome: 'Helena Dias', email: 'helena.dias@example.com', telefone: '11911110000' },
    }),
    prisma.cliente.create({
      data: { nome: 'Igor Santos', email: 'igor.santos@example.com', telefone: '11999998888' },
    }),
    prisma.cliente.create({
      data: { nome: 'Juliana Melo', email: 'juliana.melo@example.com', telefone: '11988889999' },
    }),
    prisma.cliente.create({
      data: { nome: 'Lucas Ferreira', email: 'lucas.ferreira@example.com', telefone: '11977778888' },
    }),
    prisma.cliente.create({
      data: { nome: 'Mariana Castro', email: 'mariana.castro@example.com', telefone: '11966667777' },
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
      data: new Date('2026-09-01T10:00:00Z'),
      clienteId: bruno.id,
      itens: {
        create: [
          { itemId: camiseta.id, quantidade: 2, valorUnitarioPraticado: camiseta.valorUnitario },
          { itemId: agua.id, quantidade: 1, valorUnitarioPraticado: agua.valorUnitario },
        ],
      },
    },
  });

  await prisma.pedido.create({
    data: {
      data: new Date('2026-09-01T13:00:00Z'),
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
      data: new Date('2026-09-01T14:30:00Z'),
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
      data: new Date('2026-09-01T16:30:00Z'),
      clienteId: carla.id,
      itens: {
        create: [
          { itemId: cerveja.id, quantidade: 3, valorUnitarioPraticado: cerveja.valorUnitario },
          { itemId: pastel.id, quantidade: 2, valorUnitarioPraticado: pastel.valorUnitario },
        ],
      },
    },
  });

  await prisma.pedido.create({
    data: {
      data: new Date('2026-09-02T18:15:00Z'),
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
      data: new Date('2026-09-02T20:00:00Z'),
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
      data: new Date('2026-09-02T21:45:00Z'),
      clienteId: ana.id,
      itens: {
        create: [{ itemId: pastel.id, quantidade: 5, valorUnitarioPraticado: pastel.valorUnitario }],
      },
    },
  });

  await prisma.pedido.create({
    data: {
      data: new Date('2026-09-02T22:15:00Z'),
      clienteId: diego.id,
      itens: {
        create: [
          { itemId: hamburguer.id, quantidade: 1, valorUnitarioPraticado: hamburguer.valorUnitario },
          { itemId: camiseta.id, quantidade: 1, valorUnitarioPraticado: camiseta.valorUnitario },
        ],
      },
    },
  });

  // Mais 16 pedidos gerados de forma determinística (não aleatória, pra o
  // seed dar sempre o mesmo resultado), só pra ter volume suficiente e
  // exercitar a paginação da listagem (24 pedidos no total, 3 páginas com
  // o limit padrão de 10). Usa só os 8 clientes extras (2x cada) pra não
  // repetir ana/bruno/carla/diego, que já aparecem 2x nos pedidos acima.
  const clientes = [eduardo, fernanda, gabriel, helena, igor, juliana, lucas, mariana];
  const itens = [cerveja, agua, hamburguer, pastel, camiseta];
  const dias = ['2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02', '2026-09-03'];

  for (let i = 0; i < 16; i++) {
    const cliente = clientes[i % clientes.length];
    const itemA = itens[i % itens.length];
    const itemB = itens[(i + 2) % itens.length];
    const dia = dias[i % dias.length];
    const hora = String(8 + (i % 12)).padStart(2, '0');
    const minuto = String((i % 4) * 15).padStart(2, '0');

    await prisma.pedido.create({
      data: {
        data: new Date(`${dia}T${hora}:${minuto}:00Z`),
        clienteId: cliente.id,
        itens: {
          create: [
            {
              itemId: itemA.id,
              quantidade: (i % 3) + 1,
              valorUnitarioPraticado: itemA.valorUnitario,
            },
            {
              itemId: itemB.id,
              quantidade: (i % 2) + 1,
              valorUnitarioPraticado: itemB.valorUnitario,
            },
          ],
        },
      },
    });
  }

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
