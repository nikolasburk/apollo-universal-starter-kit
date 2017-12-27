import {
  listAdapter,
  findAdapter,
  getAdapter,
  createWithoutIdAdapter,
  deleteMultiConditionAdapter,
  getManyRelationAdapter
} from '../../../../stores/sql/knex/helpers/crud';

export const searchUserCertificate = findAdapter('user_certificates');

export const getUserFromCertificate = getAdapter('user_certificates', { idField: 'serial' });
export const getCertificatesForUsers = getManyRelationAdapter('user_certificates', {
  idField: 'userId',
  elemField: 'name',
  collectionField: 'userId'
});

export const listUserCertificate = listAdapter('user_certificates');
export const createUserCertificate = createWithoutIdAdapter('user_certificates');
export const deleteUserCertificate = deleteMultiConditionAdapter('user_certificates');

export async function getUserFromSerial(serial, trx) {
  return getUserFromCertificate(serial, trx);
}
