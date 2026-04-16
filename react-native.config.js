module.exports = {
  dependencies: {
    '@react-native-async-storage/async-storage': {
      platforms: {
        android: {
          // Setting these to null prevents the autolinking script from trying to
          // link this module in CMake, which is failing in RN 0.81.5 because
          // the module doesn't provide the expected C++ targets.
          libraryName: null,
          componentDescriptors: null,
          cmakeListsPath: null,
        },
      },
    },
  },
};
