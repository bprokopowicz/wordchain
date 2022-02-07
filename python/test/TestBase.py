import sys
import unittest

sys.path.insert(0, "../src")

class TestBase(unittest.TestCase):
    @staticmethod
    def main(className):
        for index, arg in enumerate(sys.argv):
            if index == 0:
                continue

            if ".test_" in arg:
                sys.argv[index] = arg
            elif "test_" in arg:
                sys.argv[index] = "{}.{}".format(className, arg)
            else:
                sys.argv[index] = "{}.test_{}".format(className, arg)
                
        unittest.main()
