import * as fs from 'fs';

let file = fs.readFileSync('src/components/Sales/PaymentGateway.tsx', 'utf8');

// Insert polling effect after the createPayment effect
const useEffectRegex = /createPayment\(\);\n    return \(\) => \{\n      isMounted = false;\n    \};\n  \}, \[activeTab, amount, companyData, companyId\]\);/g;
const pollingEffect = `createPayment();
    return () => {
      isMounted = false;
    };
  }, [activeTab, amount, companyData, companyId]);

  useEffect(() => {
    if (!paymentId || status !== "PENDING") return;
    
    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(\`/api/payments/status/\${paymentId}\`);
        if (!isMounted) return;
        if (res.data.status === "CONFIRMED") {
          setStatus("CONFIRMED");
          toast.success("Pagamento via Mercado Pago aprovado!");
          setTimeout(onSuccess, 1500);
        } else if (res.data.status === "EXPIRED") {
          setStatus("EXPIRED");
          toast.error("O pagamento expirou. Tente novamente.");
        }
      } catch (err) {
        // Ignorar erros de rede no polling
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [paymentId, status, onSuccess]);`;
file = file.replace(useEffectRegex, pollingEffect);

// Add error handling in createPayment catch
const catchRegex = /\} catch \(error\) \{\n        if \(\!isMounted\) return;\n        console\.error\("Error creating payment:", error\);\n        \/\/ Fallback for demo\/manual confirmation without backend/g;
const catchUpdate = `} catch (error: any) {
        if (!isMounted) return;
        console.error("Error creating payment:", error);
        if (error.response?.data?.error) {
          toast.error(error.response.data.error);
        }
        // Fallback for demo/manual confirmation without backend`;
file = file.replace(catchRegex, catchUpdate);

fs.writeFileSync('src/components/Sales/PaymentGateway.tsx', file);
