// Obejście pnpm - ładujemy bindings ręcznie  
const path = require('path');
const bsqlPath = path.join(__dirname, 'node_modules', 'better-sqlite3');
const bindingPath = path.join(bsqlPath, 'build', 'Release', 'better_sqlite3.node');

// Monkey-patch require na czas ładowania
const origResolve = module.constructor._resolveFilename;
module.constructor._resolveFilename = function(request, parent, ...rest) {
  if (request === 'bindings') {
    return path.join(__dirname, 'node_modules', '.pnpm', 'bindings@1.5.0', 'node_modules', 'bindings', 'bindings.js');
  }
  return origResolve.call(this, request, parent, ...rest);
};

const Database = require(path.join(bsqlPath, 'lib', 'index.js'));

module.constructor._resolveFilename = origResolve;

const db = new Database(process.argv[2] || path.join(__dirname, 'prisma', 'prod.db'), { readonly: true });
const rows = db.prepare(`
  SELECT 
    o.orderNumber,
    o.customerName,
    o.status,
    oq.beamsCount,
    oq.meters,
    oq.status as reqStatus
  FROM Delivery d
  JOIN DeliveryOrder do2 ON do2.deliveryId = d.id
  JOIN [Order] o ON o.id = do2.orderId
  JOIN OrderRequirement oq ON oq.orderId = o.id
  JOIN Profile p ON p.id = oq.profileId
  JOIN Color c ON c.id = oq.colorId
  WHERE d.deliveryDate LIKE '2026-03-06%'
    AND p.number = '9315'
    AND c.code = '000'
  ORDER BY o.orderNumber
`).all();
console.log(JSON.stringify(rows, null, 2));
console.log('---');
console.log('Znalezione zlecenia:', rows.length);
db.close();
