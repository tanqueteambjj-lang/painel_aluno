const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { MercadoPagoConfig, Preference } = require("mercadopago");

admin.initializeApp();

// Configuração do Mercado Pago
// Substitua pelo seu Access Token do Mercado Pago
const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || "APP_USR-5825120061754229-022016-ecb35610bbb69399336717aaf09d0539-89303803" });

const PLAN_DICT = {
  'infantil-mensal': { price: 189.90, short: 'Infantil Mensal', months: 1 },
  'infantil-trimestral': { price: 168.90, short: 'Infantil Trimestral', months: 3 },
  'infantil-semestral': { price: 157.90, short: 'Infantil Semestral', months: 6 },
  'adulto-mensal': { price: 168.90, short: 'Adulto Mensal', months: 1 },
  'adulto-trimestral': { price: 147.90, short: 'Adulto Trimestral', months: 3 },
  'adulto-semestral': { price: 126.90, short: 'Adulto Semestral', months: 6 },
  'mensal': { price: 168.90, short: 'Mensal', months: 1 },
  'trimestral': { price: 147.90, short: 'Trimestral', months: 3 },
  'semestral': { price: 126.90, short: 'Semestral', months: 6 },
  'anual': { price: 100.00, short: 'Anual', months: 12 },
  'plano-mensal': { price: 168.90, short: 'Plano Mensal', months: 1 },
  'plano-trimestral': { price: 147.90, short: 'Plano Trimestral', months: 3 },
  'plano-semestral': { price: 126.90, short: 'Plano Semestral', months: 6 },
  'plano-anual': { price: 100.00, short: 'Plano Anual', months: 12 },
  'combo-dupla': { price: 250.00, short: 'Combo Dupla', months: 1 },
  'combo-familia': { price: 362.02, short: 'Combo Família', months: 1 },
  'administracao': { price: 0.00, short: 'Administração', months: 0 },
  'dependente': { price: 0.00, short: 'Dependente', months: 0 }
};

exports.createPaymentPreference = onCall({ cors: true }, async (request) => {
  try {
    const { studentId } = request.data;

    if (!studentId) {
      throw new HttpsError("invalid-argument", "Faltam parâmetros obrigatórios.");
    }

    let planKey = 'adulto-mensal';
    let planInfo = PLAN_DICT[planKey];

    if (studentId !== 'mock_student_id' && studentId !== 'test_user') {
      const db = admin.firestore();
      const studentRef = db.collection("artifacts").doc("tanqueteam-bjj").collection("public").doc("data").collection("students").doc(studentId);
      const studentSnap = await studentRef.get();

      if (!studentSnap.exists) {
        throw new HttpsError("not-found", "Aluno não encontrado.");
      }

      const studentData = studentSnap.data();
      const rawPlanKey = studentData.plan || 'N/A';
      planKey = rawPlanKey.toLowerCase().replace(/\s+/g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      planInfo = PLAN_DICT[planKey];
      if (!planInfo) {
        throw new HttpsError("failed-precondition", "Plano inválido ou não encontrado.");
      }
    }

    if (planInfo.price === 0) {
       throw new HttpsError("failed-precondition", "Este plano é isento de pagamento.");
    }

    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: [
          {
            id: planKey,
            title: `Mensalidade - ${planInfo.short}`,
            quantity: 1,
            unit_price: Number(planInfo.price),
            currency_id: "BRL",
          },
        ],
        back_urls: {
          success: "https://www.tanqueteambjj.com.br/painel_aluno.html",
          failure: "https://www.tanqueteambjj.com.br/painel_aluno.html",
          pending: "https://www.tanqueteambjj.com.br/painel_aluno.html",
        },
        auto_return: "approved",
        external_reference: studentId,
        // webhook para receber notificações
        notification_url: "https://us-central1-tanqueteambjj.cloudfunctions.net/mercadopagoWebhook"
      }
    });

    return {
      id: result.id,
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point,
    };
  } catch (error) {
    console.error("Erro ao criar preferência:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("aborted", `Erro ao processar pagamento: ${error.message}`);
  }
});

exports.mercadopagoWebhook = onRequest(async (req, res) => {
  try {
    const { type, data } = req.body;

    if (type === "payment") {
      const paymentId = data.id;
      
      console.log(`Pagamento recebido: ${paymentId}`);
      
      const { Payment } = require("mercadopago");
      const payment = new Payment(client);
      
      const paymentData = await payment.get({ id: paymentId });
      
      if (paymentData.status === "approved") {
        const studentId = paymentData.external_reference;
        
        if (studentId) {
          const db = admin.firestore();
          const studentRef = db.collection("artifacts").doc("tanqueteam-bjj").collection("public").doc("data").collection("students").doc(studentId);
          
          const studentSnap = await studentRef.get();
          if (studentSnap.exists) {
            const studentData = studentSnap.data();
            const rawPlanKey = studentData.plan || 'N/A';
            const planKey = rawPlanKey.toLowerCase().replace(/\s+/g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const planInfo = PLAN_DICT[planKey];
            
            let newDueDate = new Date();
            if (studentData.dueDate) {
               const currentDueDate = new Date(studentData.dueDate);
               if (currentDueDate > newDueDate) {
                 newDueDate = currentDueDate;
               }
            }
            
            if (planInfo && planInfo.months > 0) {
               newDueDate.setMonth(newDueDate.getMonth() + planInfo.months);
            } else {
               newDueDate.setMonth(newDueDate.getMonth() + 1);
            }

            await studentRef.update({
              paymentStatus: "Em dia",
              lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
              dueDate: newDueDate.toISOString()
            });
            
            console.log(`Status do aluno ${studentId} atualizado para 'Em dia'. Novo vencimento: ${newDueDate.toISOString()}`);
          }
        } else {
          console.warn("Pagamento aprovado, mas sem external_reference (studentId).");
        }
      }
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Erro no webhook:", error);
    res.status(500).send("Erro interno");
  }
});
