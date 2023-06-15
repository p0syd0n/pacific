module.exports = ({ config }) => ({
  name: config.name,
  slug: "pacific",
  extra: {
    eas: {
      projectId: "10d3769a-3ca3-4a09-ad87-cab16a190c66"
    }
  },
  "ios": {
    "bundleIdentifier": "com.oceann.pacific",
    "buildNumber": "1.0.0"
  },
});