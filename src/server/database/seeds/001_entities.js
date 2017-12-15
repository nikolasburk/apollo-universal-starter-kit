import _ from 'lodash';
import uuidv4 from 'uuid';
import bcrypt from 'bcryptjs';
import truncateTables from '../../../common/db';
import settings from '../../../../settings';

import orgs from './data/entities/orgs';
import groups from './data/entities/groups';
import users from './data/entities/users';
import sa from './data/entities/sa';

let config = settings.entities;
let auth = settings.auth;

export async function seed(knex, Promise) {
  if (config.orgs.enabled === true) {
    await truncateTables(knex, Promise, ['serviceaccounts', 'users', 'groups', 'orgs']);

    let createRels = true;
    await createOrgs(knex, orgs, createRels);
  } else if (config.groups.enabled === true) {
    await truncateTables(knex, Promise, ['serviceaccounts', 'users', 'groups']);
  } else if (config.users.enabled === true) {
    await truncateTables(knex, Promise, ['users']);

    let domain = 'example.com';
    let shorts = ['owner', 'admin', 'developer', 'subscriber', 'user'];

    await createUsers(knex, shorts, domain);
  }
}

async function createOrgs(knex, orgs, createRels) {
  for (let org of orgs) {
    console.log('Creating org:', org.name);

    const oid = uuidv4();
    // create org
    await knex('orgs').insert({
      id: oid,
      name: org.name,
      is_active: true
    });

    org.id = oid;

    // create org profile
    if (org.profile !== null) {
      await knex('org_profile').insert({
        org_id: oid,
        domain: org.domain,
        display_name: org.profile.displayName,
        description: org.profile.description
      });
    }

    // create org groups
    if (config.groups.enabled) {
      await createGroups(knex, org.groups, org.name);
    }

    // create org users
    if (config.users.enabled) {
      await createUsers(knex, org.users, org.profile.domain);
    }

    // create org service accounts
    if (config.serviceaccounts.enabled) {
      await createServiceAccounts(knex, org.serviceaccounts, org.profile.domain);
    }

    // create org -> group -> user / service account relationshiprs
    if (createRels) {
      if (config.groups.enabled) {
        await createOrgGroupRels(knex, org, org.groups);
      }

      if (config.users.enabled) {
        await createOrgUserRels(knex, org, org.users);
      }

      if (config.serviceaccounts.enabled) {
        await createOrgServiceAccountRels(knex, org, org.serviceaccounts);
      }

      if (config.serviceaccounts.enabled) {
        await createOrgGroupUserSARels(knex, org);
      }
    }
  }
}

async function createGroups(knex, shorts, namePrefix) {
  for (let group of shorts) {
    // get the seed object by name
    let groupSeed = _.find(groups, g => {
      return g.name === group;
    });

    const gid = uuidv4();
    // save group
    await knex('groups').insert({
      id: gid,
      name: (namePrefix ? namePrefix + ':' : '') + groupSeed.name,
      is_active: true
    });

    // save group profile
    if (groupSeed.profile) {
      await knex('group_profile').insert({
        group_id: gid,
        display_name: groupSeed.profile.displayName,
        description: groupSeed.profile.description
      });
    }
  }
}

async function createUsers(knex, shorts, domain) {
  for (let user of shorts) {
    // get the actual seed object by short
    let userSeed = _.find(users, u => {
      return u.short == user;
    });
    const uid = uuidv4();
    // save user
    await knex('users').insert({
      id: uid,
      email: userSeed.short + '@' + domain,
      is_active: true
    });

    // save user password
    if (auth.authentication.password.enabled === true && userSeed.password) {
      await knex('user_password').insert({
        user_id: uid,
        password: await bcrypt.hash(userSeed.password, 12)
      });
    }

    // save user profile
    if (userSeed.profile) {
      await knex('user_profile').insert({
        user_id: uid,
        display_name: userSeed.profile.displayName,
        first_name: userSeed.profile.firstName,
        middle_name: userSeed.profile.middleName,
        last_name: userSeed.profile.lastName,
        suffix: userSeed.profile.suffix,
        locale: userSeed.profile.locale,
        language: userSeed.profile.language
      });
    }
  }
}

async function createServiceAccounts(knex, shorts, domain) {
  for (let acct of shorts) {
    // get the actual seed object by short
    let acctSeed = _.find(sa, a => {
      return a.short == acct;
    });

    const aid = uuidv4();
    // save service account
    await knex('serviceaccounts').insert({
      id: aid,
      email: acctSeed.short + '@' + domain,
      is_active: true
    });

    // save sa serial
    await knex('serviceaccount_certificates').insert({
      serviceaccount_id: aid,
      serial: acctSeed.serial + ':' + domain
    });

    // save sa profile
    if (acctSeed.profile !== null) {
      await knex('serviceaccount_profile').insert({
        serviceaccount_id: aid,
        display_name: acctSeed.profile.displayName,
        description: acctSeed.profile.description
      });
    }
  }
}

async function createOrgGroupRels(knex, org, groupShorts) {
  const [oid] = await knex
    .select('id')
    .from('orgs')
    .where('name', '=', org.name);

  for (let short of groupShorts) {
    const [gid] = await knex
      .select('id')
      .from('groups')
      .where('name', '=', org.name + ':' + short);

    await knex('orgs_groups').insert({
      org_id: oid.id,
      group_id: gid.id
    });
  }
}

async function createOrgUserRels(knex, org, userShorts) {
  const [oid] = await knex
    .select('id')
    .from('orgs')
    .where('name', '=', org.name);

  for (let short of userShorts) {
    const [uid] = await knex
      .select('id')
      .from('users')
      .where('email', '=', short + '@' + org.profile.domain);

    await knex('orgs_users').insert({
      org_id: oid.id,
      user_id: uid.id
    });
  }
}

async function createOrgServiceAccountRels(knex, org, acctShorts) {
  const [oid] = await knex
    .select('id')
    .from('orgs')
    .where('name', '=', org.name);

  for (let short of acctShorts) {
    const [sid] = await knex
      .select('id')
      .from('serviceaccounts')
      .where('email', '=', short + '@' + org.profile.domain);

    await knex('orgs_serviceaccounts').insert({
      org_id: oid.id,
      serviceaccount_id: sid.id
    });
  }
}

async function createOrgGroupUserSARels(knex, org) {
  for (let G of org.groupRels) {
    const [gid] = await knex
      .select('id')
      .from('groups')
      .where('name', '=', org.name + ':' + G.name);

    if (G.users) {
      for (let short of G.users) {
        const [uid] = await knex
          .select('id')
          .from('users')
          .where('email', '=', short + '@' + org.profile.domain);

        await knex('groups_users').insert({
          group_id: gid.id,
          user_id: uid.id
        });
      }
    }

    if (G.serviceaccounts) {
      for (let short of G.serviceaccounts) {
        const [sid] = await knex
          .select('id')
          .from('serviceaccounts')
          .where('email', '=', short + '@' + org.profile.domain);

        await knex('groups_serviceaccounts').insert({
          group_id: gid.id,
          serviceaccount_id: sid.id
        });
      }
    }
  } // end loop over groupRels
}
