// Упражнения 3 и 4: свой класс ошибки, instanceof и cause.

class ValidationError extends Error {
  constructor(field, message, options) {
    super(message, options); // options может содержать { cause }
    this.name = 'ValidationError';
    this.field = field;
  }
}

/** Строка JSON → пользователь { name, age }. */
function parseUser(json) {
  let data;
  try {
    data = JSON.parse(json);
  } catch (error) {
    // Заворачиваем низкоуровневую ошибку в свою, сохраняя исходную в cause.
    throw new ValidationError(null, 'User must be valid JSON', { cause: error });
  }
  // ?. — защита от правильного, но «пустого» JSON вроде 'null'.
  if (typeof data?.name !== 'string' || data.name === '') {
    throw new ValidationError('name', 'Name is required');
  }
  if (!Number.isInteger(data.age) || data.age < 0) {
    throw new ValidationError('age', 'Age must be a non-negative integer');
  }
  return { name: data.name, age: data.age };
}

const inputs = [
  '{"name":"Ann","age":30}',
  '{"name":"Ann","age":-1}',
  '{"age":5}',
  'not json',
  'null', // правильный JSON, но не объект
];

for (const input of inputs) {
  try {
    console.log('OK:', parseUser(input));
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error; // чужие ошибки не глотаем
    const field = error.field ? ` (field: ${error.field})` : '';
    console.log(`${error.name}${field}: ${error.message}`);
    if (error.cause) {
      console.log(`  caused by ${error.cause.name}: ${error.cause.message}`);
    }
  }
}
