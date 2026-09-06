import { afterEach, describe, expect, it } from 'vitest';
import { shallowMount } from '@vue/test-utils';

import Form from '../Form.vue';

const getValidation = Form.methods.getValidation;

const validationFor = (field, required) =>
  getValidation.call(
    {
      isContactFieldRequired: () => required,
    },
    field
  );
const originalChatwootWebChannel = window.chatwootWebChannel;

afterEach(() => {
  window.chatwootWebChannel = originalChatwootWebChannel;
});

describe('PreChat Form getValidation', () => {
  it('returns accepted for a required checkbox', () => {
    expect(validationFor({ type: 'checkbox', name: 'checkbox' }, true)).toEqual(
      [['accepted']]
    );
  });

  it('returns optional for an optional checkbox', () => {
    expect(
      validationFor({ type: 'checkbox', name: 'checkbox' }, false)
    ).toEqual([['optional']]);
  });

  it('returns required for a required text field', () => {
    expect(validationFor({ type: 'text', name: 'text' }, true)).toEqual([
      ['required'],
    ]);
  });

  it('combines required and type-specific validation rules', () => {
    expect(
      validationFor({ type: 'email', name: 'emailAddress' }, true)
    ).toEqual([['required'], ['email']]);
  });

  it('renders the German Praxis identity fields with only email required as a contact route', () => {
    window.chatwootWebChannel = { preChatFormEnabled: true };
    const preChatFields = [
      {
        field_type: 'contact_attribute',
        label: 'Vorname',
        name: 'vorname',
        type: 'text',
        enabled: true,
        required: true,
      },
      {
        field_type: 'contact_attribute',
        label: 'Nachname',
        name: 'nachname',
        type: 'text',
        enabled: true,
        required: true,
      },
      {
        field_type: 'standard',
        label: 'Telefon',
        name: 'phoneNumber',
        type: 'text',
        enabled: true,
        required: false,
      },
      {
        field_type: 'standard',
        label: 'E-Mail',
        name: 'emailAddress',
        type: 'email',
        enabled: true,
        required: true,
      },
    ];
    const wrapper = shallowMount(Form, {
      props: {
        options: { preChatFields, preChatMessage: '' },
      },
      global: {
        directives: { dompurifyHtml: () => {} },
        mocks: {
          $store: {
            getters: {
              'appConfig/getWidgetColor': '#075e54',
              'conversation/getIsCreating': false,
              'appConfig/getIsUpdatingRoute': false,
              'campaign/getActiveCampaign': {},
              'contacts/getCurrentUser': {
                has_email: false,
                has_phone_number: false,
                identifier: '',
              },
            },
          },
          $t: key => key,
        },
      },
    });

    expect(
      wrapper.vm.enabledPreChatFields.map(({ label, name, required }) => ({
        label,
        name,
        required,
      }))
    ).toEqual([
      { label: 'Vorname', name: 'vorname', required: true },
      { label: 'Nachname', name: 'nachname', required: true },
      { label: 'Telefon', name: 'phoneNumber', required: false },
      { label: 'E-Mail', name: 'emailAddress', required: true },
    ]);
  });
});
