function login(usernameOrMileage, password, callback) {
    const request = require('request');
    const querystring = require('node:querystring');
    var options = {
      'method': 'POST',
      'url': 'https://www.alaskaair.com/www2/ssl/myalaskaair/myalaskaair.aspx?CurrentForm=UCSignInStart&nav:account:signin&INT-_AS_NAV_-prodID:MileagePlan',
      'headers': {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      form: {
        'UserId': usernameOrMileage,
        'Password': password,
        'JumpToSelection': 'https://testcert.alaskaair.com/www2/ssl/myalaskaair/myalaskaair.aspx',
        'signInClient': 'signInWidget'
      }
    };
    request(options, function (err, response, body) {
      if (err) {
        return callback(err);
      }
      if (response.statusCode === 401) {
        return callback(new Error("Got 401"));
      }
      // parse the response and extract the cookies
      const cookies = getCookiesFromResponse(response);
  
      var userStuff = querystring.parse(cookies["AS%5FNAME"]);
      var accountStuff = querystring.parse(cookies["AS%5FACNT"]);
  
      // Get the user id, username, nickname, email address from the cookies
      var username = userStuff["UID"];
      var firstName = userStuff["FN"];
      var lastName = userStuff["LN"];
      var mileagePlanNumber = userStuff["MP"];
      var personId = accountStuff["ID"];
      callback(null, {
        user_id: "aea3cfe6-35b3-4738-a311-42dc88539a58",
        username: usernameOrMileage,
        realUsername: username,
        firstName: firstName,
        lastName: lastName,
        mileagePlanNumber: mileagePlanNumber
      });
    });
  
    function getCookiesFromResponse(response) {
      const cookies = {};
      const cookieHeader = response.headers['set-cookie'];
  
      if (cookieHeader) {
        cookieHeader.forEach(cookie => {
          const parts = cookie.split(';');
          parts.forEach(part => {
            const { firstPart, remainder } = splitFirstOccurrence(part, '=');
            const name = firstPart.trim();
            const value = remainder.trim();
            cookies[name] = value;
          });
        });
      }
      return cookies;
    }
  
    function splitFirstOccurrence(str, separator) {
      const [firstPart, ...rest] = str.split(separator);
      const remainder = rest.join(separator);
      return { firstPart, remainder };
    }
  }