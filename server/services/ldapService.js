import ldap from 'ldapjs';

export async function authenticateLDAP(username, password) {
  return new Promise((resolve, reject) => {
    if (!process.env.LDAP_URL) {
      return reject(new Error('LDAP is not configured'));
    }

    const client = ldap.createClient({
      url: process.env.LDAP_URL
    });

    client.on('error', (err) => {
      reject(err);
    });

    const bindDN = process.env.LDAP_BIND_DN;
    const bindPassword = process.env.LDAP_BIND_PASSWORD;
    const searchBase = process.env.LDAP_SEARCH_BASE;
    const userFilterTemplate = process.env.LDAP_USER_FILTER || '(sAMAccountName={{username}})';
    
    // Replace placeholder with actual username
    const userFilter = userFilterTemplate.replace('{{username}}', username);

    client.bind(bindDN, bindPassword, (err) => {
      if (err) {
        client.unbind();
        return reject(new Error('LDAP Bind Failed: ' + err.message));
      }

      const searchOptions = {
        filter: userFilter,
        scope: 'sub',
        attributes: ['dn', 'sAMAccountName', 'userPrincipalName', 'mail', 'displayName']
      };

      client.search(searchBase, searchOptions, (err, res) => {
        if (err) {
          client.unbind();
          return reject(new Error('LDAP Search Failed: ' + err.message));
        }

        let userEntry = null;

        res.on('searchEntry', (entry) => {
          userEntry = entry.pojo;
        });

        res.on('error', (err) => {
          client.unbind();
          reject(new Error('LDAP Search Error: ' + err.message));
        });

        res.on('end', () => {
          if (!userEntry) {
            client.unbind();
            return resolve(null); // User not found
          }

          // Now bind as the user to verify password
          client.bind(userEntry.objectName, password, (err) => {
            client.unbind();
            if (err) {
              return resolve(null); // Invalid password
            }
            
            // Password is correct, return user details
            const getAttr = (name) => {
              const attr = userEntry.attributes.find(a => a.type === name);
              return attr ? attr.values[0] : null;
            };

            resolve({
              username: getAttr('sAMAccountName') || username,
              email: getAttr('mail') || getAttr('userPrincipalName') || `${username}@local`,
              fullName: getAttr('displayName') || username
            });
          });
        });
      });
    });
  });
}
