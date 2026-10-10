export const hello = (name = 'ЦЕХ') => `привет, ${name}`;

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(`${hello()}\n`);
}
