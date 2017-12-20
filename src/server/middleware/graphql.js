import { graphqlExpress } from 'apollo-server-express';
import 'isomorphic-fetch';

import schema from '../api/schema';
import modules from '../modules';
import settings from '../../../settings';

export default graphqlExpress(async (req, res) => {
  return {
    schema,
    context: await modules.createContext(req, res),
    debug: false,
    tracing: !!settings.engine.engineConfig.apiKey,
    cacheControl: !!settings.engine.engineConfig.apiKey
  };
});
