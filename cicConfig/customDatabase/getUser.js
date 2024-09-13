function login(username, callback) {
  var request = require('request');
  var options = {
    'method': 'POST',
    'url': 'https://apis.alaskaair.com/1/marketing/loyaltymanagement/account/graphql',
    'headers': {
      'Ocp-Apim-Subscription-Key': '3ec3fe282693444ca8acf1b3a04d68d4',
      'Content-Type': 'application/json',
      'Authorization': 'Bearer TODO'
    },
    body: JSON.stringify({
      query: `query($after: String, $first: Int, $criteria: SearchPersonsInput) {
persons(after: $after, first: $first, criteria: $criteria) {
totalCount
pageInfo{
hasPreviousPage
hasNextPage
startCursor
endCursor
}
items {
personId
identity {
userName
createdDate
lastVisitDate
}
profiles {
id
mileagePlanNumber
contactId
firstName
middleName
lastName
suffix
preferredName
dateOfBirth
gender
emails {
emailAddress
isPrimary
isFutile
}
phones {
phoneNumber
countryCode
description
isPrimary
}
mailingAddress {
displayName
line1
line2
cityName
stateProvince
countryCode
postalCode
organization
isFutile
}
otherLoyaltyPrograms {
company
number
}
documents {
documentType
documentNumber
expirationDate
countryOfIssue
}
travelCompanions {
id
mileagePlanNumber
displayName
firstName
middleName
lastName
prefix
suffix
preferredName
gender
residence
citizenship
dateOfBirth
email {
emailAddress
isPrimary
isFutile
}
documents {
documentType
documentNumber
expirationDate
countryOfIssue
}
phone {
phoneNumber
countryCode
description
isPrimary
}
otherLoyaltyPrograms {
company
number
}
}
lastUpdatedDateTime
createdDateTime
}
}
}
}`,
      variables: {
        "after": null,
        "first": 10,
        "criteria": {
          "identity": {
            "login": {
              "type": {
                "eq": "userName"
              },
              "value": {
                "eq": username
              }
            }
          }
        }
      }
    })
  };

  request(options, function (error, response) {
    var body = JSON.parse(response.body);
    if (body.data.persons.totalCount !== 1) {
      callback(null);
    }
    else {
      var person = body.data.persons.items[0];
      callback(null, {
        "user_id": person.personId,
        "username": person.identity.userName,
        "firstName": person.profiles[0].firstName,
        "lastName": person.profiles[0].lastName,
        "mileagePlanNumber": person.profiles[0].mileagePlanNumber
      });

    }
  });
}