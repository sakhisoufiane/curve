angular.module('Curve')
  .factory('ModelHistoryFieldMapping', () => ({
    mappings: {
      salesReturnsRights: 'Sales Contract',
    },
    makeReadable(field) {
      return field.match(/^[a-z]+|[A-Z][a-z]*/g).map((x) => x[0].toUpperCase() + x.substr(1).toLowerCase()).join(' ');
    },
    extractField(path) {
      const parts = path.split('/');
      return parts[1];
    },
    formatted(path) {
      const field = this.extractField(path);
      const mapping = this.mappings[field];
      if (mapping !== undefined) {
        return mapping;
      }
      return this.makeReadable(field);
    },
    getDeliveryPartnerNameFromOps(ops, deliveryPartnerData) {
      const findDeliveryPartner = (deliveryPartnerId) => deliveryPartnerData.find((partner) => partner.id === deliveryPartnerId);

      if (Array.isArray(ops)) {
        return ops.map((op) => {
          if (op.deliveryPartnerId) {
            const deliveryPartner = findDeliveryPartner(op.deliveryPartnerId);
            return deliveryPartner ? `${deliveryPartner.name} - ${deliveryPartner.id}` : op;
          }
          return op;
        });
      }
      if (ops.deliveryPartnerId) {
        const deliveryPartner = findDeliveryPartner(ops.deliveryPartnerId);
        return deliveryPartner ? `${deliveryPartner.name} - ${deliveryPartner.id}` : ops;
      }
      return ops;
    },
  }));
