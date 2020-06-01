const findUp = require('find-up');
const fastGlob = require('fast-glob');
const keyBy = require('lodash/keyBy');
const mapValues = require('lodash/mapValues');
const omit = require('lodash/omit');

const stringRegex = /^"(.*)"$/;
const parsePropTypeName = (propTypeName) => {
  return propTypeName
    .split(' | ')
    .filter((x) => stringRegex.test(x))
    .map((x) => x.replace(stringRegex, '$1'));
};

const defaultFilterProps = ['className', 'children'];
const filterProps = (props, userFilterProps) =>
  omit(props, userFilterProps || defaultFilterProps);

module.exports = async (playroomConfig) => {
  const {
    cwd,
    filterProps: userFilterProps,
    typeScriptFiles = ['**/*.{ts,tsx}', '!**/node_modules'],
  } = playroomConfig;

  const tsConfigPath = await findUp('tsconfig.json', { cwd });

  if (!tsConfigPath) {
    return {};
  }

  try {
    const { parse } = require('react-docgen-typescript').withCustomConfig(
      tsConfigPath
    );
    const files = await fastGlob(typeScriptFiles, { cwd, absolute: true });
    const types = parse(files);
    const typesByDisplayName = keyBy(types, 'displayName');
    const parsedTypes = mapValues(typesByDisplayName, (component) =>
      mapValues(filterProps(component.props || {}, userFilterProps), (prop) =>
        parsePropTypeName(prop.type.name)
      )
    );

    return parsedTypes;
  } catch (err) {
    console.error('Error parsing static types.');
    console.error(err);
    return {};
  }
};
