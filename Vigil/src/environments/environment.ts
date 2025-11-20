// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  dashscopeApiKey: 'YOUR KEY HERE', // Replace with your actual DashScope API key
  oss: {
    region: 'oss-ap-southeast-1',
    bucket: 'vigil-bucket',
    folder: 'vigil-uploads',
    accessKeyId: 'YOUR KEY HERE',
    accessKeySecret: 'YOUR KEY HERE',
    medicalFactsKey: 'medical-sources/medical_datasource.json'
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
