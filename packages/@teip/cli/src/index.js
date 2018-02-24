#!/usr/bin/env node
/* @flow */
import { parse, buildSchema, GraphQLSchema } from 'graphql';
import { documentToModule } from '@teip/create-flow-types';
import babelGenerator from '@babel/generator';
import commander from 'commander';
import fs from 'fs';
import path from 'path';
import glob from 'glob';
import { getGraphQLConfig } from 'graphql-config';
import pkg from '../package.json';

const DEFAULT_MATCHER = '**/*.g*(raph)ql';

const schemaCache: Map<string, GraphQLSchema> = new Map();

commander
  .version(pkg.version)
  .command('generate [pattern]')
  .description('Generate flow types for files')
  .action(async (pattern = DEFAULT_MATCHER) => {
    const files = glob.sync(pattern);
    const globalConfig = getGraphQLConfig(process.cwd());
    const writtenFiles = files.forEach(file => {
      const config = globalConfig.getConfigForFile(file);
      if (config.schemaPath !== path.resolve(file)) {
        let schema: ?GraphQLSchema = schemaCache.get(config.schemaPath);
        if (!schema) {
          schema = buildSchema(fs.readFileSync(config.schemaPath).toString('utf8'));
          schemaCache.set(config.schemaPath, schema);
        }
        const fileContent = fs.readFileSync(path.resolve(process.cwd(), file));

        try {
          const ast = parse(fileContent.toString('utf8'));
          const generated = babelGenerator(documentToModule(ast, schema)).code;
          fs.writeFileSync(path.resolve(process.cwd(), `${file}.flow`), generated);
        } catch (error) {
          console.log(error);
        }
      }
    });
  });

commander.parse(process.argv);
