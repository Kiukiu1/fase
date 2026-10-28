import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

const toSnake = (value: string) =>
  value.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

export class SnakeNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  columnName(
    propertyName: string,
    customName: string | undefined,
    embeddedPrefixes: string[],
  ): string {
    return toSnake([...embeddedPrefixes, customName ?? propertyName].join('_'));
  }

  joinColumnName(relationName: string, referencedColumnName: string): string {
    return toSnake(`${relationName}_${referencedColumnName}`);
  }
}
