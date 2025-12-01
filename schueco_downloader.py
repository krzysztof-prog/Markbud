"""
Schüco Connect CSV Downloader
Aplikacja do automatycznego pobierania pliku CSV z zamówieniami ze Schüco Connect
"""

import tkinter as tk
from tkinter import ttk, messagebox
import threading
import os
import time
import glob
import traceback

# Selenium imports
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager


class SchuecoDownloader:
    """Główna klasa aplikacji"""

    # Dane logowania (zapisane w aplikacji)
    EMAIL = "krzysztof@markbud.pl"
    PASSWORD = "Markbud2020"

    # URL-e
    LOGIN_URL = "https://connect.schueco.com/"
    ORDERS_URL = "https://connect.schueco.com/schueco/pl/purchaseOrders/orders?filters=default&sort=code,false&view=default"

    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Schüco Connect - Pobieranie CSV")
        self.root.geometry("500x350")
        self.root.resizable(True, True)

        # Katalog zapisu (ten sam co aplikacja)
        self.download_dir = os.path.dirname(os.path.abspath(__file__))

        # Zapamiętaj istniejące pliki CSV przed pobraniem
        self.existing_csv_files = set()

        self.setup_ui()

    def setup_ui(self):
        """Konfiguracja interfejsu użytkownika"""

        # Ramka główna
        main_frame = ttk.Frame(self.root, padding="20")
        main_frame.pack(fill=tk.BOTH, expand=True)

        # Tytuł
        title_label = ttk.Label(
            main_frame,
            text="Schüco Connect\nPobieranie zamówień CSV",
            font=("Segoe UI", 14, "bold"),
            justify=tk.CENTER
        )
        title_label.pack(pady=(0, 20))

        # Informacja o katalogu zapisu
        info_frame = ttk.LabelFrame(main_frame, text="Informacje", padding="10")
        info_frame.pack(fill=tk.X, pady=(0, 15))

        ttk.Label(info_frame, text=f"Użytkownik: {self.EMAIL}").pack(anchor=tk.W)
        ttk.Label(info_frame, text=f"Zapis do: {self.download_dir}").pack(anchor=tk.W)

        # Pasek postępu (domyślnie ukryty)
        self.progress = ttk.Progressbar(main_frame, mode='indeterminate', length=300)
        self.progress.pack(pady=(0, 10))
        self.progress.pack_forget()  # Ukryj na start

        # Status
        self.status_var = tk.StringVar(value="Gotowy do pobrania")
        self.status_label = ttk.Label(main_frame, textvariable=self.status_var, foreground="gray")
        self.status_label.pack(pady=(0, 15))

        # Przycisk pobierania
        self.download_btn = ttk.Button(
            main_frame,
            text="Pobierz CSV",
            command=self.start_download,
            width=25
        )
        self.download_btn.pack()

    def update_status(self, message, color="gray"):
        """Aktualizuje status w UI (thread-safe)"""
        def update():
            self.status_var.set(message)
            self.status_label.config(foreground=color)
        self.root.after(0, update)

    def show_error(self, message):
        """Pokazuje błąd (thread-safe)"""
        def show():
            messagebox.showerror("Błąd", message)
        self.root.after(0, show)

    def show_success(self, message):
        """Pokazuje sukces (thread-safe)"""
        def show():
            messagebox.showinfo("Sukces", message)
        self.root.after(0, show)

    def finish_download(self):
        """Kończy pobieranie (thread-safe)"""
        def finish():
            self.progress.stop()
            self.progress.pack_forget()  # Ukryj pasek
            self.download_btn.config(state=tk.NORMAL)
        self.root.after(0, finish)

    def start_download(self):
        """Rozpoczyna pobieranie w osobnym wątku"""
        self.download_btn.config(state=tk.DISABLED)
        self.progress.pack(pady=(0, 10))  # Pokaż pasek
        self.progress.start(10)
        self.update_status("Uruchamiam...", "blue")

        # Zapamiętaj istniejące pliki CSV
        self.existing_csv_files = set(glob.glob(os.path.join(self.download_dir, "*.csv")))

        # Uruchom pobieranie w osobnym wątku
        thread = threading.Thread(target=self.download_csv, daemon=True)
        thread.start()

    def wait_for_new_csv(self, timeout=120):
        """Czeka na pojawienie się nowego pliku CSV (dłuższy timeout bo strona generuje plik)"""
        start_time = time.time()
        while time.time() - start_time < timeout:
            # Sprawdź pliki CSV
            current_files = set(glob.glob(os.path.join(self.download_dir, "*.csv")))
            new_files = current_files - self.existing_csv_files

            for f in new_files:
                if os.path.exists(f) and os.path.getsize(f) > 0:
                    return f

            # Sprawdź też pliki w trakcie pobierania
            downloading = glob.glob(os.path.join(self.download_dir, "*.crdownload"))
            if downloading:
                self.update_status("Pobieranie w toku...", "blue")

            time.sleep(1)
        return None

    def download_csv(self):
        """Główna logika pobierania CSV"""
        driver = None

        try:
            print("=== START POBIERANIA ===")
            self.update_status("Uruchamiam Chrome...", "blue")

            # Konfiguracja Chrome
            chrome_options = Options()
            chrome_options.add_argument("--start-maximized")
            chrome_options.add_argument("--disable-notifications")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")

            # Ustawienie katalogu pobierania
            prefs = {
                "download.default_directory": self.download_dir,
                "download.prompt_for_download": False,
                "download.directory_upgrade": True,
                "safebrowsing.enabled": True
            }
            chrome_options.add_experimental_option("prefs", prefs)

            # Uruchomienie przeglądarki
            driver_path = ChromeDriverManager().install()
            service = Service(driver_path)
            driver = webdriver.Chrome(service=service, options=chrome_options)
            wait = WebDriverWait(driver, 15)

            # Krok 1: Przejdź na stronę logowania
            self.update_status("Otwieram stronę...", "blue")
            driver.get(self.LOGIN_URL)

            # Krok 2: Logowanie
            self.update_status("Loguję się...", "blue")

            # Znajdź pole email
            email_field = wait.until(EC.presence_of_element_located((By.ID, "username")))
            email_field.clear()
            email_field.send_keys(self.EMAIL)

            # Znajdź pole hasła
            password_field = driver.find_element(By.ID, "password")
            password_field.clear()
            password_field.send_keys(self.PASSWORD)

            # Kliknij przycisk logowania
            login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            login_button.click()

            # Poczekaj na zalogowanie (czekaj na zniknięcie formularza logowania)
            wait.until(EC.invisibility_of_element_located((By.ID, "username")))
            time.sleep(2)

            # Krok 3: Przejdź do zamówień
            self.update_status("Przechodzę do zamówień...", "blue")
            driver.get(self.ORDERS_URL)

            # Krok 4: Znajdź i kliknij ikonę pobierania (strzałka w dół)
            self.update_status("Klikam eksport...", "blue")

            # Czekaj aż tabela się załaduje
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "sco-filter-tag")))
            time.sleep(1)

            # Szukamy ikony fa-arrow-down wewnątrz sco-filter-tag
            download_icon = wait.until(EC.presence_of_element_located((
                By.CSS_SELECTOR,
                "cx-icon.fa-arrow-down, cx-icon.fas.fa-arrow-down"
            )))

            # Przewiń do elementu i kliknij
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", download_icon)
            time.sleep(0.5)
            driver.execute_script("arguments[0].click();", download_icon)

            self.update_status("Pobieranie pliku...", "blue")

            # Czekaj na nowy plik CSV - dłuższy timeout bo strona generuje plik
            new_file = self.wait_for_new_csv(timeout=120)

            if new_file:
                filename = os.path.basename(new_file)
                print(f"Pobrano: {filename}")
                self.update_status(f"Pobrano: {filename}", "green")
                self.show_success(f"Plik CSV został pobrany:\n{new_file}")
            else:
                self.update_status("Nie znaleziono pliku", "red")
                self.show_error("Plik CSV nie został pobrany.\nSprawdź czy ikona eksportu działa poprawnie.")

        except Exception as e:
            error_msg = str(e)
            print(f"BŁĄD: {error_msg}")
            print(traceback.format_exc())
            self.update_status(f"Błąd: {error_msg[:50]}...", "red")
            self.show_error(f"Wystąpił błąd:\n{error_msg}")

        finally:
            if driver:
                driver.quit()
            self.finish_download()
            print("=== KONIEC ===")

    def run(self):
        """Uruchamia aplikację"""
        self.root.mainloop()


if __name__ == "__main__":
    app = SchuecoDownloader()
    app.run()
