import os

def main():
    os.chdir(os.path.normpath(os.path.join(os.path.abspath(__file__), os.pardir)))
    from .start import main as start_main
    start_main()


if __name__ == "__main__":
    main()