import os

def main():
    os.chdir(os.path.normpath(os.path.join(os.path.abspath(__file__), os.pardir)))
    import rlvplan
    rlvplan.start.main()


if __name__ == "__main__":
    main()