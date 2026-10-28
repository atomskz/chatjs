// Упражнение 1: Map против обычного объекта, когда ключ — объект.

const ann = { name: 'ann' };
const bob = { name: 'bob' };

const asObject = {};
asObject[ann] = 'ann state';
asObject[bob] = 'bob state'; // оба ключа превратились в строку '[object Object]'!
console.log('object keys:', Object.keys(asObject), '→', asObject[ann]);

const asMap = new Map();
asMap.set(ann, 'ann state');
asMap.set(bob, 'bob state');
console.log('map size:', asMap.size, '→', asMap.get(ann), '/', asMap.get(bob));

asMap.delete(ann);
console.log('after delete:', asMap.has(ann), asMap.size);

// Map помнит порядок добавления.
const order = new Map([
  ['c', 3],
  ['a', 1],
  ['b', 2],
]);
for (const [key, value] of order) {
  console.log(`  ${key} = ${value}`);
}
console.log('keys:', [...order.keys()], 'values:', [...order.values()]);

// Set — множество уникальных значений.
const nicks = new Set(['ann', 'bob', 'ann']);
console.log('set:', [...nicks], 'has bob:', nicks.has('bob'));
