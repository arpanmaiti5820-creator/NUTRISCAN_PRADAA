const legalMetrologyRules = [

    {
        id: "LM-001",

        title: "Common / Generic Name",

        requirement:
            "The common or generic name of the commodity should be declared.",

        field: "productName",

        severity: "HIGH",

        legalReference:
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)",

        checkType:
            "requiredText"
    },


    {
        id: "LM-002",

        title: "Net Quantity",

        requirement:
            "The net quantity should be declared in the applicable standard unit of weight, measure or number.",

        field: "quantity",

        severity: "HIGH",

        legalReference:
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)",

        checkType:
            "quantity"
    },


    {
        id: "LM-003",

        title: "Maximum Retail Price",

        requirement:
            "The retail sale price should be declared in the form of MRP and inclusive of all taxes.",

        field: "mrp",

        severity: "HIGH",

        legalReference:
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)",

        checkType:
            "mrp"
    },


    {
        id: "LM-004",

        title: "Manufacturer / Packer / Importer",

        requirement:
            "The applicable name and address of the manufacturer, packer or importer should be declared.",

        field: "manufacturer",

        severity: "HIGH",

        legalReference:
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)",

        checkType:
            "requiredText"
    },


    {
        id: "LM-005",

        title: "Name and Address",

        requirement:
            "The applicable name and address declaration should be present.",

        field: "address",

        severity: "HIGH",

        legalReference:
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)",

        checkType:
            "requiredText"
    },


    {
        id: "LM-006",

        title: "Date Declaration",

        requirement:
            "The applicable manufacture, pre-packing or import date declaration should be verified according to the commodity and applicable rules.",

        field: "manufacturingDate",

        severity: "MEDIUM",

        legalReference:
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1); applicability depends on commodity",

        checkType:
            "conditionalDate"
    },


    {
        id: "LM-007",

        title: "Best Before / Use By",

        requirement:
            "Best before or use-by information should be declared where the commodity may become unfit for human consumption with time.",

        field: "expiry",

        severity: "MEDIUM",

        legalReference:
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)",

        checkType:
            "conditionalExpiry"
    },


    {
        id: "LM-008",

        title: "Consumer Care Details",

        requirement:
            "Applicable consumer care details should be declared.",

        field: "consumerCare",

        severity: "MEDIUM",

        legalReference:
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)",

        checkType:
            "requiredText"
    },


    {
        id: "LM-009",

        title: "Country of Origin",

        requirement:
            "Country of origin should be declared for imported products.",

        field: "countryOfOrigin",

        severity: "HIGH",

        legalReference:
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)",

        checkType:
            "conditionalImport"
    },


    {
        id: "LM-010",

        title: "Unit Sale Price",

        requirement:
            "The applicable unit sale price should be declared in the prescribed unit.",

        field: "unitSalePrice",

        severity: "MEDIUM",

        legalReference:
            "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(11)",

        checkType:
            "unitSalePrice"
    }

];


module.exports = legalMetrologyRules;